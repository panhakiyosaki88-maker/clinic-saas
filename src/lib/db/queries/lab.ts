import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type LabCategory = Database["public"]["Tables"]["lab_categories"]["Row"];
export type LabRequest = Database["public"]["Tables"]["lab_requests"]["Row"];
export type LabResult = Database["public"]["Tables"]["lab_results"]["Row"];

export interface LabRequestWithNames extends LabRequest {
  patient_name: string;
  patient_number: string;
  doctor_name: string | null;
  category_name: string | null;
}

const SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name ), lab_categories ( name )`;

type Joined = LabRequest & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string } | null;
  lab_categories: { name: string } | null;
};

function map(rows: Joined[]): LabRequestWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    category_name: r.lab_categories?.name ?? null,
  }));
}

export async function listLabRequests(limit = 50): Promise<LabRequestWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_requests")
    .select(SELECT)
    .is("deleted_at", null)
    .order("requested_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export async function listPatientLabRequests(patientId: string): Promise<LabRequestWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_requests")
    .select(SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export interface LabResultWithUrl extends LabResult {
  signedUrl: string | null;
}

export interface LabRequestDetail extends LabRequestWithNames {
  results: LabResultWithUrl[];
}

export async function getLabRequest(id: string): Promise<LabRequestDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_requests")
    .select(`${SELECT}, lab_results ( * )`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Joined & { lab_results: LabResult[] | null };
  const results = (row.lab_results ?? []).slice().sort((a, b) => +new Date(b.result_at) - +new Date(a.result_at));

  const withUrls: LabResultWithUrl[] = [];
  const withFiles = results.filter((r) => r.file_path);
  let signed: { signedUrl: string | null }[] | null = null;
  if (withFiles.length > 0) {
    const res = await supabase.storage
      .from("lab-results")
      .createSignedUrls(withFiles.map((r) => r.file_path as string), 60 * 10);
    signed = res.data ?? null;
  }
  let si = 0;
  for (const r of results) {
    withUrls.push({ ...r, signedUrl: r.file_path ? signed?.[si++]?.signedUrl ?? null : null });
  }

  return { ...map([row])[0], results: withUrls };
}

export async function listLabCategories(): Promise<LabCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
