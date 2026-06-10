import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { Database } from "@/types/database";
import { LAB_TEST_PANEL } from "@/lib/lab/test-panel";

export type LabCategory = Database["public"]["Tables"]["lab_categories"]["Row"];
export type LabRequest = Database["public"]["Tables"]["lab_requests"]["Row"];
export type LabResult = Database["public"]["Tables"]["lab_results"]["Row"];

export interface LabRequestWithNames extends LabRequest {
  patient_name: string;
  patient_khmer_name: string | null;
  patient_number: string;
  doctor_name: string | null;
  doctor_avatar_path: string | null;
  category_name: string | null;
}

const SELECT = `*, patients ( full_name, khmer_name, patient_number ), doctors ( full_name, avatar_path ), lab_categories ( name )`;

type Joined = LabRequest & {
  patients: { full_name: string; khmer_name: string | null; patient_number: string } | null;
  doctors: { full_name: string; avatar_path: string | null } | null;
  lab_categories: { name: string } | null;
};

function map(rows: Joined[]): LabRequestWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_khmer_name: r.patients?.khmer_name ?? null,
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    doctor_avatar_path: r.doctors?.avatar_path ?? null,
    category_name: r.lab_categories?.name ?? null,
  }));
}

export async function listLabRequests(
  limit = 50,
  scope?: BranchScope
): Promise<LabRequestWithNames[]> {
  const supabase = await createClient();
  const query = applyBranchFilter(
    supabase
      .from("lab_requests")
      .select(SELECT)
      .is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  )
    .order("requested_at", { ascending: false })
    .limit(limit);
  const { data, error } = await query;
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

export interface PatientLabReport {
  id: string;
  lab_request_id: string;
  file_path: string | null;
  file_name: string | null;
  result_at: string;
  test_name: string;
  signedUrl: string | null;
}

/** Uploaded report files across all of a patient's lab tests, newest first. */
export async function listPatientLabReports(patientId: string): Promise<PatientLabReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_results")
    .select("id, lab_request_id, file_path, file_name, result_at, lab_requests!inner ( test_name, patient_id, deleted_at )")
    .eq("lab_requests.patient_id", patientId)
    .is("lab_requests.deleted_at", null)
    .not("file_path", "is", null)
    .order("result_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    lab_request_id: string;
    file_path: string | null;
    file_name: string | null;
    result_at: string;
    lab_requests: { test_name: string } | null;
  }[];

  const paths = rows.map((r) => r.file_path).filter((p): p is string => !!p);
  const signed = new Map<string, string | null>();
  if (paths.length > 0) {
    const res = await supabase.storage.from("lab-results").createSignedUrls(paths, 60 * 10);
    (res.data ?? []).forEach((s, i) => signed.set(paths[i], s.signedUrl ?? null));
  }

  return rows.map((r) => ({
    id: r.id,
    lab_request_id: r.lab_request_id,
    file_path: r.file_path,
    file_name: r.file_name,
    result_at: r.result_at,
    test_name: r.lab_requests?.test_name ?? "—",
    signedUrl: r.file_path ? signed.get(r.file_path) ?? null : null,
  }));
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

export interface LabCategoryGroup {
  id: string;
  name: string;
  description: string | null;
  children: LabCategory[];
}

// Panel order so groups list like the requisition sheet; unknown groups last.
const PANEL_ORDER = new Map(LAB_TEST_PANEL.map((g, i) => [g.title, i]));

/** Lab categories as Group → Subgroup. Groups are rows with no parent. */
export async function listLabCategoryTree(): Promise<LabCategoryGroup[]> {
  const cats = await listLabCategories();
  const childrenByParent = new Map<string, LabCategory[]>();
  for (const c of cats) {
    if (!c.parent_id) continue;
    const arr = childrenByParent.get(c.parent_id) ?? [];
    arr.push(c);
    childrenByParent.set(c.parent_id, arr);
  }
  return cats
    .filter((c) => !c.parent_id)
    .sort((a, b) => (PANEL_ORDER.get(a.name) ?? 999) - (PANEL_ORDER.get(b.name) ?? 999))
    .map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      children: childrenByParent.get(g.id) ?? [],
    }));
}
