import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface BillableAppointment {
  id: string;
  date: string;
  label: string;
  amount: number;
}
export interface BillableLab {
  id: string;
  date: string;
  test_name: string;
}
export interface BillableItems {
  appointments: BillableAppointment[];
  labs: BillableLab[];
}

/**
 * Charges a patient has incurred but not yet been billed for: completed
 * appointments (consultation fee from the doctor) and lab requests. Anything
 * already linked to an invoice (invoice_source_links) is excluded, so a source
 * is never billed twice. Pricing for lab items is left to the reviewer.
 */
export async function getUnbilledForPatient(patientId: string): Promise<BillableItems> {
  const supabase = await createClient();

  const [apptRes, labRes, linkRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, doctors ( full_name, consultation_fee )")
      .eq("patient_id", patientId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("lab_requests")
      .select("id, test_name, requested_at")
      .eq("patient_id", patientId)
      .neq("status", "cancelled")
      .is("deleted_at", null)
      .order("requested_at", { ascending: false }),
    supabase.from("invoice_source_links").select("source, source_id").in("source", ["appointment", "lab"]),
  ]);

  const billed = new Set((linkRes.data ?? []).map((l) => `${l.source}:${l.source_id}`));

  const appts = (apptRes.data ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    doctors: { full_name: string; consultation_fee: number | null } | null;
  }[];
  const appointments: BillableAppointment[] = appts
    .filter((a) => !billed.has(`appointment:${a.id}`))
    .map((a) => ({
      id: a.id,
      date: a.scheduled_at,
      label: a.doctors?.full_name ? `Consultation — ${a.doctors.full_name}` : "Consultation",
      amount: Number(a.doctors?.consultation_fee ?? 0),
    }));

  const labRows = (labRes.data ?? []) as { id: string; test_name: string; requested_at: string }[];
  const labs: BillableLab[] = labRows
    .filter((l) => !billed.has(`lab:${l.id}`))
    .map((l) => ({ id: l.id, date: l.requested_at, test_name: l.test_name }));

  return { appointments, labs };
}
