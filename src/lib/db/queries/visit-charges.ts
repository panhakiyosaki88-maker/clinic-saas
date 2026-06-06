import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveOpenVisitId } from "@/lib/db/open-visit";
import type { BenefitType, ServiceCategory } from "@/types/database";
import { type MembershipBenefit, type BillingAlerts } from "./visit-billing";

/** A billable charge a visit incurred — the same source set drives Suggested
 *  charges, the Billing Workspace and the resulting invoice. */
export type ChargeSource = "appointment" | "lab" | "pharmacy" | "procedure" | "membership";

export interface VisitCharge {
  source: ChargeSource;
  sourceId: string;
  category: ServiceCategory; // consultation | lab | pharmacy | procedure | membership
  description: string;
  quantity: number;
  unitPrice: number;
  date: string;
  /** True when no price was found and the reviewer must set one. */
  needsPrice: boolean;
  /** True once this charge is linked to a live (non-cancelled) invoice. */
  billed: boolean;
  /** Which invoice holds it (null when unbilled). */
  billedInvoiceId: string | null;
  /** Billed to an editable invoice (no payments) → can be un-billed. */
  unbillable: boolean;
}

/** A medicine prescribed in the visit, with how much is still un-dispensed. */
export interface PrescribedMedicine {
  /** Catalog medicine id, or null when the prescribed name isn't stocked. */
  medicineId: string | null;
  name: string;
  prescribedQty: number;
  dispensedQty: number;
  remainingQty: number;
  sellingPrice: number;
  stockQuantity: number;
}

export interface VisitChargeSet {
  patientId: string;
  /** The resolved visit these charges belong to (null when none is open). */
  visitId: string | null;
  charges: VisitCharge[];
  /** Prescribed medicines (aggregated across the visit's prescriptions) so the
   *  panel can dispense the remaining quantity into a billable pharmacy line. */
  prescribedMedicines: PrescribedMedicine[];
  membership: MembershipBenefit | null;
  alerts: BillingAlerts;
}

const empty = (patientId: string, visitId: string | null): VisitChargeSet => ({
  patientId,
  visitId,
  charges: [],
  prescribedMedicines: [],
  membership: null,
  alerts: { unbilledLabs: 0, unbilledMedicines: 0, membershipAvailable: false },
});

/**
 * Single source of truth for a visit's billable activity. Detects every charge
 * (billed *and* unbilled) tied to the encounter — the live/finished consultation,
 * lab tests, dispensed medicines, procedures and the membership joining fee — and
 * tags each with its billed state (which invoice holds it, whether it can still be
 * un-billed). Also returns the visit's prescribed medicines with their remaining
 * un-dispensed quantity (so a prescription can be dispensed into pharmacy lines)
 * and the active membership benefit.
 *
 * A falsy `visitId` resolves the patient's most-recent open visit; when none is
 * open there is no live encounter, so an empty set is returned.
 */
export async function getVisitChargeSet(
  patientId: string,
  visitId?: string | null
): Promise<VisitChargeSet> {
  const supabase = await createClient();
  const scopeVisit = visitId || (await resolveOpenVisitId(supabase, patientId));
  if (!scopeVisit) return empty(patientId, null);

  const [apptRes, labRes, dispRes, procRes, memberRes, rxRes, medRes, linkRes, priceRes] =
    await Promise.all([
      supabase
        .from("appointments")
        // Both the live consult (in_consultation) and finished ones bill a fee.
        .select("id, scheduled_at, doctors ( full_name, consultation_fee )")
        .eq("patient_id", patientId)
        .eq("visit_id", scopeVisit)
        .in("status", ["in_consultation", "completed"])
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("lab_requests")
        .select("id, test_name, requested_at")
        .eq("patient_id", patientId)
        .eq("visit_id", scopeVisit)
        .neq("status", "cancelled")
        .is("deleted_at", null)
        .order("requested_at", { ascending: false }),
      supabase
        .from("inventory_transactions")
        .select("id, medicine_id, change, unit_price, created_at, medicines ( name, selling_price )")
        .eq("reason", "dispense")
        .eq("patient_id", patientId)
        .eq("visit_id", scopeVisit)
        .order("created_at", { ascending: false }),
      supabase
        .from("visit_procedures")
        .select("id, name, price, quantity, performed_at")
        .eq("patient_id", patientId)
        .eq("visit_id", scopeVisit)
        .is("deleted_at", null)
        .order("performed_at", { ascending: false }),
      supabase
        .from("patient_memberships")
        .select("id, started_at, membership_plans ( name, price, benefit_type, benefit_value )")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("started_at", { ascending: false }),
      supabase
        .from("prescriptions")
        .select("prescription_items ( medicine_name, quantity )")
        .eq("patient_id", patientId)
        .eq("visit_id", scopeVisit)
        .is("deleted_at", null),
      supabase
        .from("medicines")
        .select("id, name, selling_price, stock_quantity")
        .is("deleted_at", null)
        .eq("is_active", true),
      supabase
        .from("invoice_source_links")
        .select("source, source_id, invoice_id, invoices ( status, amount_paid )")
        .in("source", ["appointment", "lab", "pharmacy", "procedure", "membership"]),
      supabase
        .from("service_prices")
        .select("name, unit_price")
        .eq("category", "lab")
        .is("archived_at", null),
    ]);

  // Billed-state per source: which live invoice holds it, and whether it can be
  // un-billed (invoice has no payments yet).
  const billedTo = new Map<string, string>();
  const unbillable = new Set<string>();
  for (const l of (linkRes.data ?? []) as unknown as {
    source: string;
    source_id: string;
    invoice_id: string;
    invoices: { status: string; amount_paid: number } | null;
  }[]) {
    const inv = l.invoices;
    if (!inv || inv.status === "cancelled") continue; // freed charge
    const key = `${l.source}:${l.source_id}`;
    billedTo.set(key, l.invoice_id);
    if (Number(inv.amount_paid) === 0) unbillable.add(key);
  }
  const tag = (source: ChargeSource, id: string) => {
    const key = `${source}:${id}`;
    const invoiceId = billedTo.get(key) ?? null;
    return { billed: invoiceId !== null, billedInvoiceId: invoiceId, unbillable: unbillable.has(key) };
  };

  const labPrice = new Map((priceRes.data ?? []).map((p) => [p.name.toLowerCase(), Number(p.unit_price)]));
  const charges: VisitCharge[] = [];

  // Consultations — fee from the attending doctor.
  for (const a of (apptRes.data ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    doctors: { full_name: string; consultation_fee: number | null } | null;
  }[]) {
    charges.push({
      source: "appointment",
      sourceId: a.id,
      category: "consultation",
      description: a.doctors?.full_name ? `Consultation — ${a.doctors.full_name}` : "Consultation",
      quantity: 1,
      unitPrice: Number(a.doctors?.consultation_fee ?? 0),
      date: a.scheduled_at,
      needsPrice: !a.doctors?.consultation_fee,
      ...tag("appointment", a.id),
    });
  }

  // Lab tests — priced from the service catalog by name when available.
  let unbilledLabs = 0;
  for (const l of (labRes.data ?? []) as { id: string; test_name: string; requested_at: string }[]) {
    const price = labPrice.get(l.test_name.toLowerCase());
    const t = tag("lab", l.id);
    if (!t.billed) unbilledLabs += 1;
    charges.push({
      source: "lab",
      sourceId: l.id,
      category: "lab",
      description: l.test_name,
      quantity: 1,
      unitPrice: price ?? 0,
      date: l.requested_at,
      needsPrice: price === undefined,
      ...t,
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
    const qty = Math.abs(Number(d.change)) || 1;
    const price = d.unit_price ?? d.medicines?.selling_price ?? null;
    const t = tag("pharmacy", d.id);
    if (!t.billed) unbilledMedicines += 1;
    charges.push({
      source: "pharmacy",
      sourceId: d.id,
      category: "pharmacy",
      description: d.medicines?.name ?? "Dispensed medicine",
      quantity: qty,
      unitPrice: Number(price ?? 0),
      date: d.created_at,
      needsPrice: price === null,
      ...t,
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
    charges.push({
      source: "procedure",
      sourceId: p.id,
      category: "procedure",
      description: p.name,
      quantity: Number(p.quantity) || 1,
      unitPrice: Number(p.price),
      date: p.performed_at,
      needsPrice: false,
      ...tag("procedure", p.id),
    });
  }

  // Membership — joining fee is billable; the benefit is a workspace discount.
  let membership: MembershipBenefit | null = null;
  for (const m of (memberRes.data ?? []) as unknown as {
    id: string;
    started_at: string;
    membership_plans: { name: string; price: number; benefit_type: BenefitType; benefit_value: number } | null;
  }[]) {
    const plan = m.membership_plans;
    if (!plan) continue;
    if (!membership) {
      membership = {
        membershipId: m.id,
        planName: plan.name,
        benefitType: plan.benefit_type,
        benefitValue: Number(plan.benefit_value),
      };
    }
    if (Number(plan.price) > 0) {
      charges.push({
        source: "membership",
        sourceId: m.id,
        category: "membership",
        description: `Membership — ${plan.name}`,
        quantity: 1,
        unitPrice: Number(plan.price),
        date: m.started_at,
        needsPrice: false,
        ...tag("membership", m.id),
      });
    }
  }

  // Prescribed medicines → remaining un-dispensed quantity per catalog medicine,
  // so the panel can dispense it into a billable pharmacy line. Aggregated across
  // the visit's prescriptions (case-insensitive by name).
  const prescribed = new Map<string, { name: string; quantity: number }>();
  for (const rx of (rxRes.data ?? []) as unknown as {
    prescription_items: { medicine_name: string | null; quantity: number | null }[] | null;
  }[]) {
    for (const it of rx.prescription_items ?? []) {
      const name = (it.medicine_name ?? "").trim();
      const key = name.toLowerCase();
      if (!key) continue;
      const prev = prescribed.get(key);
      prescribed.set(key, { name, quantity: (prev?.quantity ?? 0) + (Number(it.quantity) || 0) });
    }
  }

  const catalog = new Map(
    ((medRes.data ?? []) as { id: string; name: string; selling_price: number | null; stock_quantity: number }[]).map(
      (m) => [m.name.trim().toLowerCase(), m]
    )
  );
  // Already-dispensed quantity per catalog medicine for this visit.
  const dispensedByMed = new Map<string, number>();
  for (const d of (dispRes.data ?? []) as { medicine_id: string | null; change: number }[]) {
    if (!d.medicine_id) continue;
    dispensedByMed.set(d.medicine_id, (dispensedByMed.get(d.medicine_id) ?? 0) + Math.abs(Number(d.change)));
  }

  const prescribedMedicines: PrescribedMedicine[] = [];
  for (const { name, quantity } of prescribed.values()) {
    const med = catalog.get(name.toLowerCase());
    const medicineId = med?.id ?? null;
    const dispensedQty = medicineId ? dispensedByMed.get(medicineId) ?? 0 : 0;
    prescribedMedicines.push({
      medicineId,
      name,
      prescribedQty: quantity,
      dispensedQty,
      remainingQty: Math.max(0, quantity - dispensedQty),
      sellingPrice: Number(med?.selling_price ?? 0),
      stockQuantity: med?.stock_quantity ?? 0,
    });
  }
  prescribedMedicines.sort((a, b) => a.name.localeCompare(b.name));

  return {
    patientId,
    visitId: scopeVisit,
    charges,
    prescribedMedicines,
    membership,
    alerts: {
      unbilledLabs,
      unbilledMedicines,
      membershipAvailable: membership !== null,
    },
  };
}
