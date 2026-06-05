import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/validations/patient";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { Database, EmploymentType } from "@/types/database";

export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
export type DoctorSchedule = Database["public"]["Tables"]["doctor_schedules"]["Row"];
export type DoctorTimeOff = Database["public"]["Tables"]["doctor_time_off"]["Row"];
export type DoctorDocument = Database["public"]["Tables"]["doctor_documents"]["Row"];
export type DoctorQualification = Database["public"]["Tables"]["doctor_qualifications"]["Row"];
export type DoctorLicense = Database["public"]["Tables"]["doctor_licenses"]["Row"];

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "visiting", "locum"];

export async function listDoctors(opts: {
  search?: string;
  active?: "active" | "inactive";
  employmentType?: string;
  branch?: BranchScope;
} = {}): Promise<Doctor[]> {
  const supabase = await createClient();
  let query = supabase.from("doctors").select("*").is("deleted_at", null);

  const search = sanitizeSearch(opts.search);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,specialization.ilike.%${search}%`);
  }
  if (opts.active === "active") query = query.eq("is_active", true);
  if (opts.active === "inactive") query = query.eq("is_active", false);
  if (opts.employmentType && EMPLOYMENT_TYPES.includes(opts.employmentType)) {
    query = query.eq("employment_type", opts.employmentType as EmploymentType);
  }
  if (opts.branch) {
    query = applyBranchFilter(query, opts.branch.activeId, opts.branch.primaryId);
  }

  const { data, error } = await query.order("full_name", { ascending: true });
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

export interface DoctorDocumentWithUrl extends DoctorDocument {
  signedUrl: string | null;
}

/** Credential documents with short-lived signed download URLs from Storage. */
export async function listDoctorDocuments(doctorId: string): Promise<DoctorDocumentWithUrl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_documents")
    .select("*")
    .eq("doctor_id", doctorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const docs = data ?? [];
  if (docs.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from("doctor-documents")
    .createSignedUrls(docs.map((d) => d.file_path), 60 * 10);

  return docs.map((d, i) => ({ ...d, signedUrl: signed?.[i]?.signedUrl ?? null }));
}

export async function listDoctorQualifications(doctorId: string): Promise<DoctorQualification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_qualifications")
    .select("*")
    .eq("doctor_id", doctorId)
    .is("deleted_at", null)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listDoctorLicenses(doctorId: string): Promise<DoctorLicense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_licenses")
    .select("*")
    .eq("doctor_id", doctorId)
    .is("deleted_at", null)
    .order("expiry_on", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface DoctorAvailabilityToday {
  id: string;
  name: string;
  avatarPath: string | null;
  specialization: string | null;
  slots: { start: string; end: string }[];
  offToday: boolean;
  /** Distinct patients seen today (from finalized/any EMR visits + completed appts). */
  seenToday: number;
  /** Currently in a consultation right now. */
  busy: boolean;
}

/** Which doctors are working today (recurring schedule minus time-off), plus
 *  their live workload: patients seen today and whether they're mid-consult. */
export async function getDoctorAvailabilityToday(): Promise<DoctorAvailabilityToday[]> {
  const supabase = await createClient();
  const today = new Date();
  const dow = today.getDay(); // 0=Sun..6=Sat, matches doctor_schedules
  const ymd = today.toISOString().slice(0, 10);
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const [{ data: docs }, { data: schedules }, { data: timeOff }, { data: todaysAppts }] = await Promise.all([
    supabase.from("doctors").select("id, full_name, specialization, user_id, avatar_path").is("deleted_at", null).eq("is_active", true),
    supabase.from("doctor_schedules").select("doctor_id, start_time, end_time").eq("day_of_week", dow).eq("is_active", true),
    supabase.from("doctor_time_off").select("doctor_id").lte("start_date", ymd).gte("end_date", ymd),
    supabase
      .from("appointments")
      .select("doctor_id, patient_id, status")
      .is("deleted_at", null)
      .gte("scheduled_at", dayStart)
      .in("status", ["in_consultation", "completed"]),
  ]);

  const slotsByDoctor = new Map<string, { start: string; end: string }[]>();
  for (const s of schedules ?? []) {
    const list = slotsByDoctor.get(s.doctor_id) ?? [];
    list.push({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) });
    slotsByDoctor.set(s.doctor_id, list);
  }
  const offSet = new Set((timeOff ?? []).map((t) => t.doctor_id));

  // Patients seen today + busy flag, derived from today's appointments per doctor.
  const seenByDoctor = new Map<string, Set<string>>();
  const busySet = new Set<string>();
  for (const a of todaysAppts ?? []) {
    if (!a.doctor_id) continue;
    if (a.status === "in_consultation") busySet.add(a.doctor_id);
    const set = seenByDoctor.get(a.doctor_id) ?? new Set<string>();
    if (a.patient_id) set.add(a.patient_id);
    seenByDoctor.set(a.doctor_id, set);
  }

  return (docs ?? []).map((d) => ({
    id: d.id,
    name: d.full_name,
    avatarPath: d.avatar_path,
    specialization: d.specialization,
    slots: (slotsByDoctor.get(d.id) ?? []).sort((a, b) => a.start.localeCompare(b.start)),
    offToday: offSet.has(d.id),
    seenToday: seenByDoctor.get(d.id)?.size ?? 0,
    busy: busySet.has(d.id),
  }));
}

export interface DoctorAnalytics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  completionRate: number; // 0–100
  noShowRate: number; // 0–100
  patientsSeen: number;
  estimatedRevenue: number;
  trend: { label: string; value: number }[]; // completed per month, last 6 months
}

/**
 * Appointment-derived analytics for a doctor over the last `rangeDays`. Revenue
 * is an ESTIMATE (completed appointments × consultation_fee): invoices carry no
 * doctor link today, so true attribution isn't available.
 */
export async function getDoctorAnalytics(
  doctor: Doctor,
  rangeDays = 180
): Promise<DoctorAnalytics> {
  const supabase = await createClient();
  const since = new Date(Date.now() - rangeDays * 86_400_000);
  const sinceISO = since.toISOString();

  const { data } = await supabase
    .from("appointments")
    .select("scheduled_at, status, patient_id")
    .eq("doctor_id", doctor.id)
    .is("deleted_at", null)
    .gte("scheduled_at", sinceISO);

  const rows = data ?? [];
  const total = rows.length;
  let completed = 0, cancelled = 0, noShow = 0, upcoming = 0;
  const seen = new Set<string>();

  // Month buckets (last 6 months, oldest → newest).
  const months: { key: string; label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString(undefined, { month: "short" }),
      value: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  for (const a of rows) {
    if (a.status === "completed") {
      completed++;
      if (a.patient_id) seen.add(a.patient_id);
      const d = new Date(a.scheduled_at);
      const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (idx !== undefined) months[idx].value++;
    } else if (a.status === "cancelled") cancelled++;
    else if (a.status === "no_show") noShow++;
    else if (a.status === "scheduled" || a.status === "waiting") upcoming++;
    if (a.status === "in_consultation" && a.patient_id) seen.add(a.patient_id);
  }

  const fee = Number(doctor.consultation_fee ?? 0);
  return {
    total,
    completed,
    cancelled,
    noShow,
    upcoming,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    noShowRate: total ? Math.round((noShow / total) * 100) : 0,
    patientsSeen: seen.size,
    estimatedRevenue: Math.round(completed * fee * 100) / 100,
    trend: months.map((m) => ({ label: m.label, value: m.value })),
  };
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
