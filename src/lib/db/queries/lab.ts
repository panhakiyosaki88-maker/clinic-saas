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
  doctor_avatar_path: string | null;
  category_name: string | null;
}

const SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name, avatar_path ), lab_categories ( name )`;

type Joined = LabRequest & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string; avatar_path: string | null } | null;
  lab_categories: { name: string } | null;
};

function map(rows: Joined[]): LabRequestWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    doctor_avatar_path: r.doctors?.avatar_path ?? null,
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

export async function listLabCategories(): Promise<LabCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
