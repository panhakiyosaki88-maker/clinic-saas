import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type PatientVisit = Database["public"]["Tables"]["patient_visits"]["Row"];

export interface VisitWithNames extends PatientVisit {
  patient_name: string | null;
  patient_khmer_name: string | null;
  patient_number: string | null;
  doctor_name: string | null;
}

const SELECT = `*, patients ( full_name, khmer_name, patient_number ), doctors ( full_name )`;
type Joined = PatientVisit & {
  patients: { full_name: string; khmer_name: string | null; patient_number: string } | null;
  doctors: { full_name: string } | null;
};
function mapVisit(r: Joined): VisitWithNames {
  return {
    ...r,
    patient_name: r.patients?.full_name ?? null,
    patient_khmer_name: r.patients?.khmer_name ?? null,
    patient_number: r.patients?.patient_number ?? null,
    doctor_name: r.doctors?.full_name ?? null,
  };
}

export async function getVisit(id: string): Promise<VisitWithNames | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_visits")
    .select(SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? mapVisit(data as unknown as Joined) : null;
}

export async function listPatientVisits(patientId: string): Promise<VisitWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_visits")
    .select(SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("visit_date", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Joined[]).map(mapVisit);
}

/**
 * The branch a visit's consultation took place in — the visit's own branch, or
 * (when unset) the branch of an appointment threaded onto the visit. Used to
 * default a visit invoice's branch to where the patient was actually seen.
 */
export async function resolveVisitBranchId(visitId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: visit } = await supabase
    .from("patient_visits")
    .select("branch_id")
    .eq("id", visitId)
    .maybeSingle();
  if (visit?.branch_id) return visit.branch_id;
  const { data: appt } = await supabase
    .from("appointments")
    .select("branch_id")
    .eq("visit_id", visitId)
    .not("branch_id", "is", null)
    .limit(1)
    .maybeSingle();
  return appt?.branch_id ?? null;
}

export type TimelineKind =
  | "appointment"
  | "consultation"
  | "lab"
  | "prescription"
  | "dispense"
  | "procedure"
  | "invoice"
  | "payment";

export interface VisitTimelineEvent {
  kind: TimelineKind;
  at: string;
  title: string;
  detail: string | null;
  amount: number | null;
}

/**
 * A chronological view of everything that happened in a visit: appointment →
 * consultation → lab orders → prescription → dispensing → procedures → invoice →
 * payment. Scoped by visit_id (the records threaded to this encounter).
 */
export async function getVisitTimeline(visitId: string): Promise<VisitTimelineEvent[]> {
  const supabase = await createClient();

  const [appt, recs, labs, rx, disp, procs, invs] = await Promise.all([
    supabase
      .from("appointments")
      .select("scheduled_at, status, reason, doctors ( full_name )")
      .eq("visit_id", visitId)
      .is("deleted_at", null),
    supabase
      .from("medical_records")
      .select("visit_date, chief_complaint, diagnosis")
      .eq("visit_id", visitId)
      .is("deleted_at", null),
    supabase
      .from("lab_requests")
      .select("requested_at, test_name, status")
      .eq("visit_id", visitId)
      .is("deleted_at", null),
    supabase
      .from("prescriptions")
      .select("prescribed_at, prescription_items ( id )")
      .eq("visit_id", visitId)
      .is("deleted_at", null),
    supabase
      .from("inventory_transactions")
      .select("created_at, change, medicines ( name )")
      .eq("visit_id", visitId)
      .eq("reason", "dispense"),
    supabase
      .from("visit_procedures")
      .select("performed_at, name, price, quantity")
      .eq("visit_id", visitId)
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("issued_at, invoice_number, total, status, payments ( paid_at, amount, receipt_number, kind )")
      .eq("visit_id", visitId)
      .is("deleted_at", null),
  ]);

  const events: VisitTimelineEvent[] = [];

  for (const a of (appt.data ?? []) as unknown as { scheduled_at: string; status: string; reason: string | null; doctors: { full_name: string } | null }[]) {
    events.push({
      kind: "appointment",
      at: a.scheduled_at,
      title: "Appointment",
      detail: [a.doctors?.full_name, a.reason].filter(Boolean).join(" · ") || a.status,
      amount: null,
    });
  }
  for (const r of (recs.data ?? []) as { visit_date: string; chief_complaint: string | null; diagnosis: string | null }[]) {
    events.push({
      kind: "consultation",
      at: r.visit_date,
      title: "Doctor consultation",
      detail: r.diagnosis ?? r.chief_complaint,
      amount: null,
    });
  }
  for (const l of (labs.data ?? []) as { requested_at: string; test_name: string; status: string }[]) {
    events.push({ kind: "lab", at: l.requested_at, title: `Lab order — ${l.test_name}`, detail: l.status, amount: null });
  }
  for (const p of (rx.data ?? []) as unknown as { prescribed_at: string; prescription_items: { id: string }[] | null }[]) {
    const n = p.prescription_items?.length ?? 0;
    events.push({ kind: "prescription", at: p.prescribed_at, title: "Prescription", detail: `${n} item${n === 1 ? "" : "s"}`, amount: null });
  }
  for (const d of (disp.data ?? []) as unknown as { created_at: string; change: number; medicines: { name: string } | null }[]) {
    events.push({ kind: "dispense", at: d.created_at, title: `Dispensed — ${d.medicines?.name ?? "medicine"}`, detail: `Quantity ${Math.abs(Number(d.change))}`, amount: null });
  }
  for (const p of (procs.data ?? []) as { performed_at: string; name: string; price: number; quantity: number }[]) {
    events.push({ kind: "procedure", at: p.performed_at, title: `Procedure — ${p.name}`, detail: null, amount: Number(p.price) * Number(p.quantity) });
  }
  for (const inv of (invs.data ?? []) as unknown as {
    issued_at: string;
    invoice_number: string;
    total: number;
    status: string;
    payments: { paid_at: string; amount: number; receipt_number: string; kind: string }[] | null;
  }[]) {
    events.push({ kind: "invoice", at: inv.issued_at, title: `Invoice ${inv.invoice_number}`, detail: inv.status, amount: Number(inv.total) });
    for (const pay of inv.payments ?? []) {
      events.push({
        kind: "payment",
        at: pay.paid_at,
        title: `${pay.kind === "refund" ? "Refund" : "Payment"} ${pay.receipt_number}`,
        detail: null,
        amount: Number(pay.amount) * (pay.kind === "refund" ? -1 : 1),
      });
    }
  }

  return events.sort((a, b) => +new Date(a.at) - +new Date(b.at));
}
