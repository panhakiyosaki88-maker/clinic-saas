import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
export type DoctorSchedule = Database["public"]["Tables"]["doctor_schedules"]["Row"];
export type DoctorTimeOff = Database["public"]["Tables"]["doctor_time_off"]["Row"];

export async function listDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .is("deleted_at", null)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDoctor(id: string): Promise<Doctor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listSchedules(doctorId: string): Promise<DoctorSchedule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTimeOff(doctorId: string): Promise<DoctorTimeOff[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_time_off")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface DoctorAvailabilityToday {
  id: string;
  name: string;
  specialization: string | null;
  slots: { start: string; end: string }[];
  offToday: boolean;
}

/** Which doctors are working today (recurring schedule minus time-off). */
export async function getDoctorAvailabilityToday(): Promise<DoctorAvailabilityToday[]> {
  const supabase = await createClient();
  const today = new Date();
  const dow = today.getDay(); // 0=Sun..6=Sat, matches doctor_schedules
  const ymd = today.toISOString().slice(0, 10);

  const [{ data: docs }, { data: schedules }, { data: timeOff }] = await Promise.all([
    supabase.from("doctors").select("id, full_name, specialization").is("deleted_at", null).eq("is_active", true),
    supabase.from("doctor_schedules").select("doctor_id, start_time, end_time").eq("day_of_week", dow).eq("is_active", true),
    supabase.from("doctor_time_off").select("doctor_id").lte("start_date", ymd).gte("end_date", ymd),
  ]);

  const slotsByDoctor = new Map<string, { start: string; end: string }[]>();
  for (const s of schedules ?? []) {
    const list = slotsByDoctor.get(s.doctor_id) ?? [];
    list.push({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) });
    slotsByDoctor.set(s.doctor_id, list);
  }
  const offSet = new Set((timeOff ?? []).map((t) => t.doctor_id));

  return (docs ?? []).map((d) => ({
    id: d.id,
    name: d.full_name,
    specialization: d.specialization,
    slots: (slotsByDoctor.get(d.id) ?? []).sort((a, b) => a.start.localeCompare(b.start)),
    offToday: offSet.has(d.id),
  }));
}

export interface DoctorPerformance {
  visits: number;
  patientsSeen: number;
}

/**
 * Basic performance metrics derived from EMR visits attributed to the doctor's
 * linked user. Richer metrics (appointments, revenue) arrive with those modules.
 */
export async function getDoctorPerformance(doctor: Doctor): Promise<DoctorPerformance> {
  if (!doctor.user_id) return { visits: 0, patientsSeen: 0 };
  const supabase = await createClient();

  const { count } = await supabase
    .from("medical_records")
    .select("id", { count: "exact", head: true })
    .eq("provider_user_id", doctor.user_id)
    .is("deleted_at", null);

  const { data: rows } = await supabase
    .from("medical_records")
    .select("patient_id")
    .eq("provider_user_id", doctor.user_id)
    .is("deleted_at", null)
    .limit(1000);

  const patientsSeen = new Set((rows ?? []).map((r) => r.patient_id)).size;
  return { visits: count ?? 0, patientsSeen };
}
