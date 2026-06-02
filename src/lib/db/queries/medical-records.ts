import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MedicalRecord = Database["public"]["Tables"]["medical_records"]["Row"];
export type VitalSigns = Database["public"]["Tables"]["vital_signs"]["Row"];

/** Visit history for a patient (newest first). */
export async function listMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medical_records")
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("visit_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface RecordDetail {
  record: MedicalRecord;
  vitals: VitalSigns[];
  attachments: { id: string; file_name: string; signedUrl: string | null }[];
}

export async function getMedicalRecord(id: string): Promise<RecordDetail | null> {
  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("medical_records")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!record) return null;

  const [{ data: vitals }, { data: docs }] = await Promise.all([
    supabase
      .from("vital_signs")
      .select("*")
      .eq("medical_record_id", id)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("patient_documents")
      .select("id, file_name, file_path")
      .eq("medical_record_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const attachments: RecordDetail["attachments"] = [];
  if (docs && docs.length > 0) {
    const { data: signed } = await supabase.storage
      .from("patient-documents")
      .createSignedUrls(docs.map((d) => d.file_path), 60 * 10);
    docs.forEach((d, i) =>
      attachments.push({ id: d.id, file_name: d.file_name, signedUrl: signed?.[i]?.signedUrl ?? null })
    );
  }

  return { record, vitals: vitals ?? [], attachments };
}

/** Most recent vitals for a patient (for a quick header on the profile). */
export async function getLatestVitals(patientId: string): Promise<VitalSigns | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vital_signs")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
