import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BenefitType, InvoiceSource, ServiceCategory } from "@/types/database";

/** One detected, not-yet-billed charge from a patient's/visit's activity. */
export interface BillableLine {
  source: InvoiceSource;       // appointment | lab | pharmacy | procedure | membership
  sourceId: string;
  category: ServiceCategory;   // consultation | lab | pharmacy | procedure | membership
  description: string;
  quantity: number;
  unitPrice: number;
  date: string;
  /** True when no price was found and the reviewer must set one. */
  needsPrice: boolean;
}

export interface MembershipBenefit {
  membershipId: string;
  planName: string;
  benefitType: BenefitType;
  benefitValue: number;
}

export interface BillingAlerts {
  unbilledLabs: number;
  unbilledMedicines: number;
  membershipAvailable: boolean;
}

export interface VisitBillables {
  patientId: string;
  visitId: string | null;
  lines: BillableLine[];
  membership: MembershipBenefit | null;
  alerts: BillingAlerts;
}

/** Discount amount a membership benefit yields against a discountable subtotal. */
export function membershipDiscountAmount(
  benefit: MembershipBenefit | null,
  subtotal: number
): number {
  if (!benefit || subtotal <= 0) return 0;
  const raw =
    benefit.benefitType === "percent"
      ? (subtotal * benefit.benefitValue) / 100
      : benefit.benefitValue;
  // Never discount below zero.
  return Math.max(0, Math.min(raw, subtotal));
}

/**
 * Smart detection: every billable activity a patient (optionally narrowed to one
 * visit) has incurred but not yet been billed for — consultations, lab tests,
 * dispensed medicines, procedures and membership joining fees. Anything already
 * linked to an invoice (invoice_source_links) is excluded, so nothing is billed
 * twice. Also returns the active membership benefit (a discount) and alert counts.
 *
 * A null visitId scans the whole patient; a visitId narrows each source to that
 * visit (newly threaded records), which is how the workspace bills one encounter.
 */
export async function getVisitBillables(
  patientId: string,
  visitId?: string | null
): Promise<VisitBillables> {
  const supabase = await createClient();
  const scopeVisit = visitId ?? null;

  const apptQ = supabase
    .from("appointments")
    .select("id, scheduled_at, doctors ( full_name, consultation_fee )")
    .eq("patient_id", patientId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false });

  const labQ = supabase
    .from("lab_requests")
    .select("id, test_name, requested_at")
    .eq("patient_id", patientId)
    .neq("status", "cancelled")
    .is("deleted_at", null)
    .order("requested_at", { ascending: false });

  const dispenseQ = supabase
    .from("inventory_transactions")
    .select("id, change, unit_price, created_at, medicines ( name, selling_price )")
    .eq("reason", "dispense")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const procQ = supabase
    .from("visit_procedures")
    .select("id, name, price, quantity, performed_at")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("performed_at", { ascending: false });

  const memberQ = supabase
    .from("patient_memberships")
    .select("id, started_at, membership_plans ( name, price, benefit_type, benefit_value )")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("started_at", { ascending: false });

  const [apptRes, labRes, dispRes, procRes, memberRes, linkRes, priceRes] = await Promise.all([
    scopeVisit ? apptQ.eq("visit_id", scopeVisit) : apptQ,
    scopeVisit ? labQ.eq("visit_id", scopeVisit) : labQ,
    scopeVisit ? dispenseQ.eq("visit_id", scopeVisit) : dispenseQ,
    scopeVisit ? procQ.eq("visit_id", scopeVisit) : procQ,
    memberQ,
    supabase
      .from("invoice_source_links")
      .select("source, source_id")
      .in("source", ["appointment", "lab", "pharmacy", "procedure", "membership"]),
    supabase
      .from("service_prices")
      .select("name, unit_price")
      .eq("category", "lab")
      .is("archived_at", null),
  ]);

  const billed = new Set((linkRes.data ?? []).map((l) => `${l.source}:${l.source_id}`));
  const labPrice = new Map((priceRes.data ?? []).map((p) => [p.name.toLowerCase(), Number(p.unit_price)]));

  const lines: BillableLine[] = [];

  // Consultations — fee from the attending doctor.
  for (const a of (apptRes.data ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    doctors: { full_name: string; consultation_fee: number | null } | null;
  }[]) {
    if (billed.has(`appointment:${a.id}`)) continue;
    lines.push({
      source: "appointment",
      sourceId: a.id,
      category: "consultation",
      description: a.doctors?.full_name ? `Consultation — ${a.doctors.full_name}` : "Consultation",
      quantity: 1,
      unitPrice: Number(a.doctors?.consultation_fee ?? 0),
      date: a.scheduled_at,
      needsPrice: !a.doctors?.consultation_fee,
    });
  }

  // Lab tests — priced from the service catalog by name when available.
  let unbilledLabs = 0;
  for (const l of (labRes.data ?? []) as { id: string; test_name: string; requested_at: string }[]) {
    if (billed.has(`lab:${l.id}`)) continue;
    const price = labPrice.get(l.test_name.toLowerCase());
    unbilledLabs += 1;
    lines.push({
      source: "lab",
      sourceId: l.id,
      category: "lab",
      description: l.test_name,
      quantity: 1,
      unitPrice: price ?? 0,
      date: l.requested_at,
      needsPrice: price === undefined,
    });
  }

  // Dispensed medicines — qty from the (negative) stock change.
  let unbilledMedicines = 0;
  for (const d of (dispRes.data ?? []) as unknown as {
    id: string;
    change: number;
    unit_price: number | null;
    created_at: string;
    medicines: { name: string; selling_price: number | null } | null;
  }[]) {
    if (billed.has(`pharmacy:${d.id}`)) continue;
    const qty = Math.abs(Number(d.change)) || 1;
    const price = d.unit_price ?? d.medicines?.selling_price ?? null;
    unbilledMedicines += 1;
    lines.push({
      source: "pharmacy",
      sourceId: d.id,
      category: "pharmacy",
      description: d.medicines?.name ?? "Dispensed medicine",
      quantity: qty,
      unitPrice: Number(price ?? 0),
      date: d.created_at,
      needsPrice: price === null,
    });
  }

  // Procedures — price snapshot taken when performed.
  for (const p of (procRes.data ?? []) as {
    id: string;
    name: string;
    price: number;
    quantity: number;
    performed_at: string;
  }[]) {
    if (billed.has(`procedure:${p.id}`)) continue;
    lines.push({
      source: "procedure",
      sourceId: p.id,
      category: "procedure",
      description: p.name,
      quantity: Number(p.quantity) || 1,
      unitPrice: Number(p.price),
      date: p.performed_at,
      needsPrice: false,
    });
  }

  // Membership — the joining/renewal fee is billable; the benefit is a discount.
  let membership: MembershipBenefit | null = null;
  for (const m of (memberRes.data ?? []) as unknown as {
    id: string;
    started_at: string;
    membership_plans: { name: string; price: number; benefit_type: BenefitType; benefit_value: number } | null;
  }[]) {
    const plan = m.membership_plans;
    if (!plan) continue;
    // First active membership provides the visit benefit (discount).
    if (!membership) {
      membership = {
        membershipId: m.id,
        planName: plan.name,
        benefitType: plan.benefit_type,
        benefitValue: Number(plan.benefit_value),
      };
    }
    // Unbilled joining fee becomes a billable line.
    if (!billed.has(`membership:${m.id}`) && Number(plan.price) > 0) {
      lines.push({
        source: "membership",
        sourceId: m.id,
        category: "membership",
        description: `Membership — ${plan.name}`,
        quantity: 1,
        unitPrice: Number(plan.price),
        date: m.started_at,
        needsPrice: false,
      });
    }
  }

  return {
    patientId,
    visitId: scopeVisit,
    lines,
    membership,
    alerts: {
      unbilledLabs,
      unbilledMedicines,
      membershipAvailable: membership !== null,
    },
  };
}
