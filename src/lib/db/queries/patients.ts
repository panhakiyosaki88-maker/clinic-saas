import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/validations/patient";
import type { Database } from "@/types/database";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type PatientDocument = Database["public"]["Tables"]["patient_documents"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["patient_timeline"]["Row"];

export const PAGE_SIZE = 20;

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
}): Promise<PatientListResult> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  const search = sanitizeSearch(opts.search);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,patient_number.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
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
