import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

export interface AppointmentWithNames extends Appointment {
  patient_name: string;
  patient_number: string;
  doctor_name: string | null;
}

const SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name )`;

type Joined = Appointment & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string } | null;
};

function map(rows: Joined[]): AppointmentWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
  }));
}

/** Appointments whose start falls in [fromISO, toISO). Powers all calendar views. */
export async function listAppointmentsInRange(
  fromISO: string,
  toISO: string
): Promise<AppointmentWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT)
    .is("deleted_at", null)
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export interface QueueEntry extends AppointmentWithNames {
  position: number;
}

/** The current waiting queue (status = waiting), longest wait first. */
export async function listQueue(): Promise<QueueEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT)
    .is("deleted_at", null)
    .eq("status", "waiting")
    .order("checked_in_at", { ascending: true });
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]).map((a, i) => ({ ...a, position: i + 1 }));
}

export async function getAppointment(id: string): Promise<AppointmentWithNames | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return map([data as unknown as Joined])[0];
}

export async function listPatientAppointments(patientId: string): Promise<AppointmentWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}
