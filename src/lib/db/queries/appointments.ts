import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { Database } from "@/types/database";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

export interface AppointmentWithNames extends Appointment {
  patient_name: string;
  patient_number: string;
  doctor_name: string | null;
  doctor_avatar_path: string | null;
}

const SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name, avatar_path )`;

type Joined = Appointment & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string; avatar_path: string | null } | null;
};

function map(rows: Joined[]): AppointmentWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    doctor_avatar_path: r.doctors?.avatar_path ?? null,
  }));
}

/** Appointments whose start falls in [fromISO, toISO). Powers all calendar views. */
export async function listAppointmentsInRange(
  fromISO: string,
  toISO: string,
  scope?: BranchScope
): Promise<AppointmentWithNames[]> {
  const supabase = await createClient();
  const query = applyBranchFilter(
    supabase
      .from("appointments")
      .select(SELECT)
      .is("deleted_at", null)
      .gte("scheduled_at", fromISO)
      .lt("scheduled_at", toISO),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  ).order("scheduled_at", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export interface QueueEntry extends AppointmentWithNames {
  position: number;
}

/** The current waiting queue (status = waiting), longest wait first. */
export async function listQueue(scope?: BranchScope): Promise<QueueEntry[]> {
  const supabase = await createClient();
  const query = applyBranchFilter(
    supabase
      .from("appointments")
      .select(SELECT)
      .is("deleted_at", null)
      .eq("status", "waiting"),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  ).order("checked_in_at", { ascending: true });
  const { data, error } = await query;
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

export interface FollowUp {
  id: string;
  patient_name: string;
  scheduled_at: string;
}

/** Upcoming follow-up appointments (reason mentions "follow") within `days`. */
export async function getUpcomingFollowUps(days = 7): Promise<FollowUp[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const until = new Date(Date.now() + days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, scheduled_at, patients ( full_name )")
    .is("deleted_at", null)
    .ilike("reason", "%follow%")
    .gte("scheduled_at", now)
    .lt("scheduled_at", until)
    .in("status", ["scheduled", "waiting"])
    .order("scheduled_at", { ascending: true })
    .limit(10);
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; scheduled_at: string; patients: { full_name: string } | null }[]).map(
    (r) => ({ id: r.id, patient_name: r.patients?.full_name ?? "—", scheduled_at: r.scheduled_at })
  );
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
