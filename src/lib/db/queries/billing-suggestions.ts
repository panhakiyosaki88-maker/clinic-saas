import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface BillableAppointment {
  id: string;
  date: string;
  label: string;
  amount: number;
  /** True once this charge is linked to an invoice — shown read-only, never re-billed. */
  billed: boolean;
  /** True when the linked invoice is still editable (no payments) and the charge
   *  can be un-billed back to a selectable state. */
  unbillable: boolean;
}
export interface BillableLab {
  id: string;
  date: string;
  test_name: string;
  /** Catalog price when the test name matches a service price, else 0. */
  amount: number;
  billed: boolean;
  unbillable: boolean;
}
export interface BillablePrescription {
  id: string;
  date: string;
  label: string;
  billed: boolean;
  unbillable: boolean;
}
export interface BillableItems {
  appointments: BillableAppointment[];
  labs: BillableLab[];
  prescriptions: BillablePrescription[];
  /** The patient's most-recent open visit (null when none is open). The
   *  Suggested charges panel stays visible — including already-billed lines —
   *  until this visit is closed/completed. */
  openVisitId: string | null;
}

/**
 * Charges tied to the patient's *current* encounter: completed appointments
 * (consultation fee from the doctor), lab requests and prescriptions belonging
 * to the most-recent open visit. Unbilled charges are selectable; already-billed
 * ones are listed read-only (greyed). When no visit is open the patient has no
 * live activity, so nothing is suggested and the panel is blank. Lab lines carry
 * the catalog price (by name) when one exists; the reviewer can override it.
 */
export async function getUnbilledForPatient(patientId: string): Promise<BillableItems> {
  const supabase = await createClient();

  const [apptRes, labRes, rxRes, linkRes, priceRes, openVisitRes] = await Promise.all([
    supabase
      .from("appointments")
      // The live consult (in_consultation) and finished ones both bill a fee; the
      // open-visit filter below keeps only the current encounter's appointment.
      .select("id, scheduled_at, visit_id, doctors ( full_name, consultation_fee )")
      .eq("patient_id", patientId)
      .in("status", ["in_consultation", "completed"])
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("lab_requests")
      .select("id, test_name, requested_at, visit_id")
      .eq("patient_id", patientId)
      .neq("status", "cancelled")
      .is("deleted_at", null)
      .order("requested_at", { ascending: false }),
    supabase
      .from("prescriptions")
      .select("id, prescribed_at, visit_id, doctors ( full_name )")
      .eq("patient_id", patientId)
      .is("deleted_at", null)
      .order("prescribed_at", { ascending: false }),
    supabase
      .from("invoice_source_links")
      .select("source, source_id, invoices ( status, amount_paid )")
      .in("source", ["appointment", "lab", "prescription"]),
    supabase
      .from("service_prices")
      .select("name, unit_price")
      .eq("category", "lab")
      .is("archived_at", null),
    supabase
      .from("patient_visits")
      .select("id")
      .eq("patient_id", patientId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("visit_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const billed = new Set<string>();
  const unbillable = new Set<string>();
  for (const l of (linkRes.data ?? []) as unknown as {
    source: string;
    source_id: string;
    invoices: { status: string; amount_paid: number } | null;
  }[]) {
    const key = `${l.source}:${l.source_id}`;
    billed.add(key);
    // Editable invoices (no payments, not cancelled) can give the charge back.
    if (l.invoices && l.invoices.status !== "cancelled" && Number(l.invoices.amount_paid) === 0) {
      unbillable.add(key);
    }
  }
  const labPrice = new Map((priceRes.data ?? []).map((p) => [p.name.toLowerCase(), Number(p.unit_price)]));
  const openVisitId = openVisitRes.data?.id ?? null;

  // Only the current open visit's charges are actionable here (billed or not).
  // With no open visit there is no live activity, so nothing is kept.
  const keep = (visitId: string | null) => openVisitId !== null && visitId === openVisitId;

  const appts = (apptRes.data ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    visit_id: string | null;
    doctors: { full_name: string; consultation_fee: number | null } | null;
  }[];
  const appointments: BillableAppointment[] = appts
    .filter((a) => keep(a.visit_id))
    .map((a) => ({
      id: a.id,
      date: a.scheduled_at,
      label: a.doctors?.full_name ? `Consultation — ${a.doctors.full_name}` : "Consultation",
      amount: Number(a.doctors?.consultation_fee ?? 0),
      billed: billed.has(`appointment:${a.id}`),
      unbillable: unbillable.has(`appointment:${a.id}`),
    }));

  const labRows = (labRes.data ?? []) as {
    id: string;
    test_name: string;
    requested_at: string;
    visit_id: string | null;
  }[];
  const labs: BillableLab[] = labRows
    .filter((l) => keep(l.visit_id))
    .map((l) => ({
      id: l.id,
      date: l.requested_at,
      test_name: l.test_name,
      amount: labPrice.get(l.test_name.toLowerCase()) ?? 0,
      billed: billed.has(`lab:${l.id}`),
      unbillable: unbillable.has(`lab:${l.id}`),
    }));

  const rxRows = (rxRes.data ?? []) as unknown as {
    id: string;
    prescribed_at: string;
    visit_id: string | null;
    doctors: { full_name: string } | null;
  }[];
  const prescriptions: BillablePrescription[] = rxRows
    .filter((p) => keep(p.visit_id))
    .map((p) => ({
      id: p.id,
      date: p.prescribed_at,
      label: p.doctors?.full_name ? `Prescription — ${p.doctors.full_name}` : "Prescription",
      billed: billed.has(`prescription:${p.id}`),
      unbillable: unbillable.has(`prescription:${p.id}`),
    }));

  return { appointments, labs, prescriptions, openVisitId };
}
