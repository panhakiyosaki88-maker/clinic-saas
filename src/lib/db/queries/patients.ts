import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/validations/patient";
import type { Database, Gender, BloodType } from "@/types/database";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type PatientDocument = Database["public"]["Tables"]["patient_documents"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["patient_timeline"]["Row"];
export type InsurancePolicy = Database["public"]["Tables"]["patient_insurance"]["Row"];
export type PatientAllergy = Database["public"]["Tables"]["patient_allergies"]["Row"];
export type PatientMedication = Database["public"]["Tables"]["patient_medications"]["Row"];
export type PatientImmunization = Database["public"]["Tables"]["patient_immunizations"]["Row"];
export type PatientCondition = Database["public"]["Tables"]["patient_conditions"]["Row"];
export type PatientConsent = Database["public"]["Tables"]["patient_consents"]["Row"];
export type PatientCommunication = Database["public"]["Tables"]["patient_communications"]["Row"];
export type PatientTag = Database["public"]["Tables"]["patient_tags"]["Row"];

export const PAGE_SIZE = 20;

/** Whole years between a YYYY-MM-DD date of birth and today, or null. */
export function patientAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

export interface PatientListResult {
  rows: Patient[];
  total: number;
  page: number;
  pageCount: number;
}

/** Paginated, searchable patient list (RLS scopes to the clinic + patients.read). */
export async function listPatients(opts: {
  search?: string;
  page?: number;
  gender?: string;
  bloodType?: string;
  tagId?: string;
}): Promise<PatientListResult> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // When filtering by tag, resolve the matching patient ids first.
  let tagPatientIds: string[] | null = null;
  if (opts.tagId) {
    const { data: links } = await supabase
      .from("patient_tag_links")
      .select("patient_id")
      .eq("tag_id", opts.tagId);
    tagPatientIds = (links ?? []).map((l) => l.patient_id);
    if (tagPatientIds.length === 0) {
      return { rows: [], total: 0, page, pageCount: 1 };
    }
  }

  let query = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (tagPatientIds) query = query.in("id", tagPatientIds);

  const search = sanitizeSearch(opts.search);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,patient_number.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (opts.gender && ["male", "female", "other"].includes(opts.gender)) {
    query = query.eq("gender", opts.gender as Gender);
  }
  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
  if (opts.bloodType && bloodTypes.includes(opts.bloodType)) {
    query = query.eq("blood_type", opts.bloodType as BloodType);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: data ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Compact patient list for select inputs (e.g. booking an appointment). */
export async function listPatientOptions(limit = 500): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, patient_number")
    .is("deleted_at", null)
    .order("full_name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, label: `${p.full_name} · ${p.patient_number}` }));
}

export async function getPatient(id: string): Promise<Patient | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface PatientDocumentWithUrl extends PatientDocument {
  signedUrl: string | null;
}

/** Patient documents with short-lived signed download URLs from Storage. */
export async function listPatientDocuments(
  patientId: string
): Promise<PatientDocumentWithUrl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_documents")
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const docs = data ?? [];
  if (docs.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from("patient-documents")
    .createSignedUrls(
      docs.map((d) => d.file_path),
      60 * 10 // 10 minutes
    );

  return docs.map((d, i) => ({
    ...d,
    signedUrl: signed?.[i]?.signedUrl ?? null,
  }));
}

export async function listPatientTimeline(patientId: string): Promise<TimelineEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_timeline")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPatientInsurance(patientId: string): Promise<InsurancePolicy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_insurance")
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Generic active-rows reader for the structured clinical-list tables. */
async function listClinical<T>(table: string, patientId: string): Promise<T[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const listPatientAllergies = (patientId: string) =>
  listClinical<PatientAllergy>("patient_allergies", patientId);
export const listPatientMedications = (patientId: string) =>
  listClinical<PatientMedication>("patient_medications", patientId);
export const listPatientImmunizations = (patientId: string) =>
  listClinical<PatientImmunization>("patient_immunizations", patientId);
export const listPatientConditions = (patientId: string) =>
  listClinical<PatientCondition>("patient_conditions", patientId);
export const listPatientConsents = (patientId: string) =>
  listClinical<PatientConsent>("patient_consents", patientId);

export async function listPatientCommunications(patientId: string): Promise<PatientCommunication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_communications")
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("sent_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/** All tags defined for the current clinic. */
export async function listClinicTags(): Promise<PatientTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_tags")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Tags currently attached to a patient (via the link table). */
export async function listPatientTags(patientId: string): Promise<PatientTag[]> {
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("patient_tag_links")
    .select("tag_id")
    .eq("patient_id", patientId);
  if (error) throw error;
  const tagIds = (links ?? []).map((l) => l.tag_id);
  if (tagIds.length === 0) return [];

  const { data, error: tagErr } = await supabase
    .from("patient_tags")
    .select("*")
    .in("id", tagIds)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (tagErr) throw tagErr;
  return data ?? [];
}
