import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { Database } from "@/types/database";

export type ImagingCategory = Database["public"]["Tables"]["imaging_categories"]["Row"];
export type ImagingService = Database["public"]["Tables"]["imaging_services"]["Row"];
export type ImagingRequest = Database["public"]["Tables"]["imaging_requests"]["Row"];
export type ImagingResult = Database["public"]["Tables"]["imaging_results"]["Row"];

export interface ImagingRequestWithNames extends ImagingRequest {
  patient_name: string;
  patient_number: string;
  doctor_name: string | null;
  category_name: string | null;
}

const SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name ), imaging_categories ( name )`;

type Joined = ImagingRequest & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string } | null;
  imaging_categories: { name: string } | null;
};

function map(rows: Joined[]): ImagingRequestWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    category_name: r.imaging_categories?.name ?? null,
  }));
}

export async function listImagingRequests(limit = 50, scope?: BranchScope): Promise<ImagingRequestWithNames[]> {
  const supabase = await createClient();
  const query = applyBranchFilter(
    supabase.from("imaging_requests").select(SELECT).is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  )
    .order("requested_at", { ascending: false })
    .limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export async function listPatientImagingRequests(patientId: string): Promise<ImagingRequestWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imaging_requests")
    .select(SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export async function getImagingRequest(id: string): Promise<ImagingRequestWithNames | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("imaging_requests").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return map([data as unknown as Joined])[0];
}

/** The clinical result (findings / impression / report) for a request, if any. */
export async function getImagingResult(requestId: string): Promise<ImagingResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imaging_results")
    .select("*")
    .eq("imaging_request_id", requestId)
    .order("result_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export interface ImagingFileLink {
  id: string;
  imaging_request_id: string;
  file_name: string | null;
  created_at: string;
  signedUrl: string | null;
}

/** Uploaded scan/report files for a request, newest first, with signed URLs. */
export async function listImagingFiles(requestId: string): Promise<ImagingFileLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imaging_files")
    .select("id, imaging_request_id, file_path, file_name, created_at")
    .eq("imaging_request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as { id: string; imaging_request_id: string; file_path: string; file_name: string | null; created_at: string }[];
  const paths = rows.map((r) => r.file_path);
  const signed = new Map<string, string | null>();
  if (paths.length > 0) {
    const res = await supabase.storage.from("imaging-files").createSignedUrls(paths, 60 * 10);
    (res.data ?? []).forEach((s, i) => signed.set(paths[i], s.signedUrl ?? null));
  }
  return rows.map((r) => ({
    id: r.id,
    imaging_request_id: r.imaging_request_id,
    file_name: r.file_name,
    created_at: r.created_at,
    signedUrl: signed.get(r.file_path) ?? null,
  }));
}

/** Count of a patient's uploaded imaging files (for the patient tab badge). */
export async function countPatientImagingFiles(patientId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("imaging_files")
    .select("id, imaging_requests!inner ( patient_id, deleted_at )", { count: "exact", head: true })
    .eq("imaging_requests.patient_id", patientId)
    .is("imaging_requests.deleted_at", null);
  if (error) throw error;
  return count ?? 0;
}

// -- Catalog / categories -----------------------------------------------------
export async function listImagingServices(): Promise<ImagingService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imaging_services")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listImagingCategories(): Promise<ImagingCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("imaging_categories").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface ImagingCategoryGroup {
  id: string;
  name: string;
  services: { id: string; name: string; modality: string | null; default_price: number }[];
}

/** Active catalog grouped by category, for the request picker. */
export async function listImagingCatalogTree(): Promise<ImagingCategoryGroup[]> {
  const [cats, services] = await Promise.all([listImagingCategories(), listImagingServices()]);
  const groups = new Map<string, ImagingCategoryGroup>();
  for (const c of cats) {
    if (c.parent_id) continue;
    groups.set(c.id, { id: c.id, name: c.name, services: [] });
  }
  const uncategorized: ImagingCategoryGroup = { id: "", name: "Uncategorized", services: [] };
  for (const s of services) {
    if (!s.is_active) continue;
    const entry = { id: s.id, name: s.name, modality: s.modality, default_price: Number(s.default_price) };
    const g = s.category_id ? groups.get(s.category_id) : null;
    (g ?? uncategorized).services.push(entry);
  }
  const result = Array.from(groups.values()).filter((g) => g.services.length > 0);
  if (uncategorized.services.length > 0) result.push(uncategorized);
  return result;
}
