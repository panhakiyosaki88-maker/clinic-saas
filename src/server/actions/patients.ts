"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createPatientSchema,
  updatePatientSchema,
  addTimelineNoteSchema,
  recordDocumentSchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type AddTimelineNoteInput,
  type RecordDocumentInput,
} from "@/lib/validations/patient";
import { ok, fail, type ActionResult } from "./types";
import type { Database, Gender } from "@/types/database";

type PatientWrite = Database["public"]["Tables"]["patients"]["Update"];

/** Maps validated form fields → DB columns, normalizing "" to null. */
function toColumns(v: Partial<CreatePatientInput>): PatientWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const out: PatientWrite = {};
  if (v.fullName !== undefined) out.full_name = v.fullName;
  if (v.gender !== undefined) out.gender = (v.gender && v.gender.length > 0 ? v.gender : null) as Gender | null;
  if (v.dateOfBirth !== undefined) out.date_of_birth = orNull(v.dateOfBirth);
  if (v.phone !== undefined) out.phone = orNull(v.phone);
  if (v.email !== undefined) out.email = orNull(v.email);
  if (v.address !== undefined) out.address = orNull(v.address);
  if (v.occupation !== undefined) out.occupation = orNull(v.occupation);
  if (v.emergencyContactName !== undefined) out.emergency_contact_name = orNull(v.emergencyContactName);
  if (v.emergencyContactPhone !== undefined) out.emergency_contact_phone = orNull(v.emergencyContactPhone);
  if (v.allergies !== undefined) out.allergies = orNull(v.allergies);
  if (v.medicalHistory !== undefined) out.medical_history = orNull(v.medicalHistory);
  if (v.chronicDiseases !== undefined) out.chronic_diseases = orNull(v.chronicDiseases);
  if (v.notes !== undefined) out.notes = orNull(v.notes);
  return out;
}

export async function createPatient(
  input: CreatePatientInput
): Promise<ActionResult<{ patientId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      created_by: user.id,
      ...toColumns(parsed.data),
      full_name: parsed.data.fullName,
    })
    .select("id, full_name")
    .single();

  if (error || !data) {
    // check_violation from the plan-limit trigger.
    if (error?.code === "23514") {
      return fail("You've reached your plan's patient limit. Upgrade to add more.");
    }
    return fail(error?.message ?? "Could not create patient.");
  }

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: data.id,
    event_type: "registered",
    title: "Patient registered",
    created_by: user.id,
  });

  revalidatePath("/patients");
  return ok({ patientId: data.id });
}

export async function updatePatient(
  patientId: string,
  input: UpdatePatientInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update(toColumns(parsed.data))
    .eq("id", patientId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  return ok(undefined);
}

/** Soft delete — clinical data is retained per the project's data rules. */
export async function deletePatient(patientId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", patientId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/patients");
  return ok(undefined);
}

export async function addTimelineNote(input: AddTimelineNoteInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = addTimelineNoteSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const { patientId, title, description } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    event_type: "note",
    title,
    description: description || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}

/** Records metadata after the client has uploaded the file to Storage. */
export async function recordPatientDocument(
  input: RecordDocumentInput
): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = recordDocumentSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid document data.");
  const { patientId, medicalRecordId, filePath, fileName, mimeType, sizeBytes } = parsed.data;

  // The file path must live under this clinic's namespace.
  if (!filePath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  const { error } = await supabase.from("patient_documents").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    medical_record_id: medicalRecordId ?? null,
    file_path: filePath,
    file_name: fileName,
    mime_type: mimeType ?? null,
    size_bytes: sizeBytes ?? null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    event_type: "document",
    title: "Document uploaded",
    description: fileName,
    created_by: user.id,
  });

  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}

export async function deletePatientDocument(
  documentId: string,
  patientId: string
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("patient_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!doc) return fail("Document not found.");

  await supabase.storage.from("patient-documents").remove([doc.file_path]);
  const { error } = await supabase
    .from("patient_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}
