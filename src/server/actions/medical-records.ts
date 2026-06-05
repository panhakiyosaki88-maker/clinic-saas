"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveOpenVisitId } from "@/lib/db/open-visit";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  addVitalsSchema,
  hasAnyVital,
  type CreateMedicalRecordInput,
  type UpdateMedicalRecordInput,
  type AddVitalsInput,
  type VitalsInput,
} from "@/lib/validations/medical-record";
import { ok, fail, type ActionResult } from "./types";
import type { Database } from "@/types/database";

type RecordWrite = Database["public"]["Tables"]["medical_records"]["Update"];
type VitalsWrite = Database["public"]["Tables"]["vital_signs"]["Insert"];

function toRecordColumns(v: Partial<UpdateMedicalRecordInput>): RecordWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const out: RecordWrite = {};
  if (v.visitDate !== undefined && v.visitDate) out.visit_date = v.visitDate;
  if (v.branchId !== undefined) out.branch_id = orNull(v.branchId);
  if (v.status !== undefined) out.status = v.status;
  if (v.chiefComplaint !== undefined) out.chief_complaint = orNull(v.chiefComplaint);
  if (v.subjective !== undefined) out.subjective = orNull(v.subjective);
  if (v.objective !== undefined) out.objective = orNull(v.objective);
  if (v.assessment !== undefined) out.assessment = orNull(v.assessment);
  if (v.plan !== undefined) out.plan = orNull(v.plan);
  if (v.diagnosis !== undefined) out.diagnosis = orNull(v.diagnosis);
  if (v.treatmentPlan !== undefined) out.treatment_plan = orNull(v.treatmentPlan);
  if (v.clinicalNotes !== undefined) out.clinical_notes = orNull(v.clinicalNotes);
  return out;
}

function toVitalsColumns(v: Partial<VitalsInput>): Partial<VitalsWrite> {
  return {
    systolic: v.systolic ?? null,
    diastolic: v.diastolic ?? null,
    pulse: v.pulse ?? null,
    temperature: v.temperature ?? null,
    height_cm: v.heightCm ?? null,
    weight_kg: v.weightKg ?? null,
    oxygen_saturation: v.oxygenSaturation ?? null,
  };
}

export async function createMedicalRecord(
  input: CreateMedicalRecordInput
): Promise<ActionResult<{ recordId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.EMR_WRITE);
  const parsed = createMedicalRecordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const { patientId, vitals, ...fields } = parsed.data;

  const supabase = await createClient();
  const visitId = await resolveOpenVisitId(supabase, patientId);
  const { data: record, error } = await supabase
    .from("medical_records")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      provider_user_id: user.id,
      visit_id: visitId,
      created_by: user.id,
      ...toRecordColumns(fields),
    })
    .select("id")
    .single();
  if (error || !record) return fail(error?.message ?? "Could not create the visit.");

  if (hasAnyVital(vitals)) {
    await supabase.from("vital_signs").insert({
      clinic_id: clinicId,
      patient_id: patientId,
      medical_record_id: record.id,
      created_by: user.id,
      ...toVitalsColumns(vitals!),
    });
  }

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    event_type: "visit",
    title: "Visit recorded",
    description: fields.diagnosis || fields.chiefComplaint || null,
    created_by: user.id,
  });

  revalidatePath(`/patients/${patientId}`);
  return ok({ recordId: record.id });
}

export async function updateMedicalRecord(
  recordId: string,
  patientId: string,
  input: UpdateMedicalRecordInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.EMR_WRITE);
  const parsed = updateMedicalRecordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("medical_records")
    .update(toRecordColumns(parsed.data))
    .eq("id", recordId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}/records/${recordId}`);
  return ok(undefined);
}

export async function addVitalSigns(input: AddVitalsInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.EMR_WRITE);
  const parsed = addVitalsSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const { patientId, medicalRecordId, ...vitals } = parsed.data;

  if (!hasAnyVital(vitals)) return fail("Enter at least one measurement.");

  const supabase = await createClient();
  const { error } = await supabase.from("vital_signs").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    medical_record_id: medicalRecordId ?? null,
    created_by: user.id,
    ...toVitalsColumns(vitals),
  });
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  if (medicalRecordId) revalidatePath(`/patients/${patientId}/records/${medicalRecordId}`);
  return ok(undefined);
}

/** Soft delete — clinical data is retained. */
export async function deleteMedicalRecord(
  recordId: string,
  patientId: string
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.EMR_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("medical_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}
