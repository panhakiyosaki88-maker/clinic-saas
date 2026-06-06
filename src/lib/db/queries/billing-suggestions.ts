import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface BillableAppointment {
  id: string;
  date: string;
  label: string;
  amount: number;
  /** True once this charge is linked to an invoice — shown read-only, never re-billed. */
  billed: boolean;
}
export interface BillableLab {
  id: string;
  date: string;
  test_name: string;
  /** Catalog price when the test name matches a service price, else 0. */
  amount: number;
  billed: boolean;
}
export interface BillablePrescription {
  id: string;
  date: string;
  label: string;
  billed: boolean;
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
 * Charges a patient has incurred: completed appointments (consultation fee from
 * the doctor), lab requests and prescriptions.
 *
 * Unbilled charges are always listed (selectable, patient-wide). Already-billed
 * charges are listed read-only — but only while they belong to the patient's
 * current open visit, so the panel keeps showing them until that visit is
 * closed/completed, then they drop off. Lab lines carry the catalog price (by
 * name) when one exists; the reviewer can override it before billing.
 */
export async function getUnbilledForPatient(patientId: string): Promise<BillableItems> {
  const supabase = await createClient();

  const [apptRes, labRes, rxRes, linkRes, priceRes, openVisitRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, visit_id, doctors ( full_name, consultation_fee )")
      .eq("patient_id", patientId)
      .eq("status", "completed")
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
      .select("source, source_id")
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

  const billed = new Set((linkRes.data ?? []).map((l) => `${l.source}:${l.source_id}`));
  const labPrice = new Map((priceRes.data ?? []).map((p) => [p.name.toLowerCase(), Number(p.unit_price)]));
  const openVisitId = openVisitRes.data?.id ?? null;

  // A billed charge is kept only while it belongs to the open visit (so it stays
  // visible until that visit closes). Unbilled charges are always kept.
  const keep = (isBilled: boolean, visitId: string | null) =>
    !isBilled || (openVisitId !== null && visitId === openVisitId);

  const appts = (apptRes.data ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    visit_id: string | null;
    doctors: { full_name: string; consultation_fee: number | null } | null;
  }[];
  const appointments: BillableAppointment[] = appts
    .filter((a) => keep(billed.has(`appointment:${a.id}`), a.visit_id))
    .map((a) => ({
      id: a.id,
      date: a.scheduled_at,
      label: a.doctors?.full_name ? `Consultation — ${a.doctors.full_name}` : "Consultation",
      amount: Number(a.doctors?.consultation_fee ?? 0),
      billed: billed.has(`appointment:${a.id}`),
    }));

  const labRows = (labRes.data ?? []) as {
    id: string;
    test_name: string;
    requested_at: string;
    visit_id: string | null;
  }[];
  const labs: BillableLab[] = labRows
    .filter((l) => keep(billed.has(`lab:${l.id}`), l.visit_id))
    .map((l) => ({
      id: l.id,
      date: l.requested_at,
      test_name: l.test_name,
      amount: labPrice.get(l.test_name.toLowerCase()) ?? 0,
      billed: billed.has(`lab:${l.id}`),
    }));

  const rxRows = (rxRes.data ?? []) as unknown as {
    id: string;
    prescribed_at: string;
    visit_id: string | null;
    doctors: { full_name: string } | null;
  }[];
  const prescriptions: BillablePrescription[] = rxRows
    .filter((p) => keep(billed.has(`prescription:${p.id}`), p.visit_id))
    .map((p) => ({
      id: p.id,
      date: p.prescribed_at,
      label: p.doctors?.full_name ? `Prescription — ${p.doctors.full_name}` : "Prescription",
      billed: billed.has(`prescription:${p.id}`),
    }));

  return { appointments, labs, prescriptions, openVisitId };
}
