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

export interface DayCount {
  label: string;
  date: string;
  count: number;
}

/** Appointment counts for the last `days` days (oldest → newest), for the trend chart. */
export async function getWeeklyAppointmentCounts(days = 7): Promise<DayCount[]> {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("appointments")
    .select("scheduled_at")
    .is("deleted_at", null)
    .gte("scheduled_at", start.toISOString());
  if (error) throw error;

  const counts = new Map<string, number>();
  const buckets: DayCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
    buckets.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), date: key, count: 0 });
  }
  for (const a of data ?? []) {
    const key = new Date(a.scheduled_at).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((b) => ({ ...b, count: counts.get(b.date) ?? 0 }));
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
