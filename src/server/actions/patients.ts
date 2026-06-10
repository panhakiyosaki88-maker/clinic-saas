"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createPatientSchema,
  updatePatientSchema,
  addTimelineNoteSchema,
  recordDocumentSchema,
  insurancePolicySchema,
  allergyEntrySchema,
  medicationEntrySchema,
  immunizationEntrySchema,
  conditionEntrySchema,
  consentEntrySchema,
  createTagSchema,
  assignTagSchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type AddTimelineNoteInput,
  type RecordDocumentInput,
  type InsurancePolicyInput,
  type AllergyEntryInput,
  type MedicationEntryInput,
  type ImmunizationEntryInput,
  type ConditionEntryInput,
  type ConsentEntryInput,
  type CreateTagInput,
  type AssignTagInput,
} from "@/lib/validations/patient";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";
import type {
  Database,
  Gender,
  BloodType,
  MaritalStatus,
  IdDocType,
  ContactMethod,
} from "@/types/database";

type PatientWrite = Database["public"]["Tables"]["patients"]["Update"];

/** Maps validated form fields → DB columns, normalizing "" to null. */
function toColumns(v: Partial<CreatePatientInput>): PatientWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const enumOrNull = <T>(s: string | undefined) => (s && s.length > 0 ? (s as T) : null);
  const out: PatientWrite = {};
  if (v.fullName !== undefined) out.full_name = v.fullName;
  if (v.branchId !== undefined) out.branch_id = orNull(v.branchId);
  if (v.gender !== undefined) out.gender = enumOrNull<Gender>(v.gender);
  if (v.dateOfBirth !== undefined) out.date_of_birth = orNull(v.dateOfBirth);
  if (v.phone !== undefined) out.phone = orNull(v.phone);
  if (v.email !== undefined) out.email = orNull(v.email);
  if (v.telegramChatId !== undefined) out.telegram_chat_id = orNull(v.telegramChatId);
  if (v.address !== undefined) out.address = orNull(v.address);
  if (v.occupation !== undefined) out.occupation = orNull(v.occupation);
  if (v.emergencyContactName !== undefined) out.emergency_contact_name = orNull(v.emergencyContactName);
  if (v.emergencyContactPhone !== undefined) out.emergency_contact_phone = orNull(v.emergencyContactPhone);
  if (v.bloodType !== undefined) out.blood_type = enumOrNull<BloodType>(v.bloodType);
  if (v.maritalStatus !== undefined) out.marital_status = enumOrNull<MaritalStatus>(v.maritalStatus);
  if (v.nationalIdType !== undefined) out.national_id_type = enumOrNull<IdDocType>(v.nationalIdType);
  if (v.nationalIdNumber !== undefined) out.national_id_number = orNull(v.nationalIdNumber);
  if (v.preferredLanguage !== undefined) out.preferred_language = orNull(v.preferredLanguage);
  if (v.preferredContactMethod !== undefined) out.preferred_contact_method = enumOrNull<ContactMethod>(v.preferredContactMethod);
  if (v.doNotContact !== undefined) out.do_not_contact = !!v.doNotContact;
  if (v.nextOfKinName !== undefined) out.next_of_kin_name = orNull(v.nextOfKinName);
  if (v.nextOfKinPhone !== undefined) out.next_of_kin_phone = orNull(v.nextOfKinPhone);
  if (v.nextOfKinRelationship !== undefined) out.next_of_kin_relationship = orNull(v.nextOfKinRelationship);
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
  const te = await getErrorT();
  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
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
      return fail(te("patient.planLimit"));
    }
    return fail(error?.message ?? te("patient.createFailed"));
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
  const te = await getErrorT();
  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
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

/**
 * Permanently deletes a patient and everything tied to them — clinical records,
 * prescriptions, lab work, documents, etc. — and removes their uploaded files
 * from Storage to reclaim space. This is irreversible and bypasses the usual
 * soft-delete; the caller must retype the patient's full name to confirm.
 *
 * Verification (permission + clinic ownership + name match) runs on the RLS
 * client; the destructive deletes run on the admin client, strictly scoped to
 * this one patient/clinic, so FK cascades can clear child rows across modules
 * and files can be removed from buckets the caller may not otherwise write to.
 */
export async function purgePatient(patientId: string, confirmName: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!patient) return fail("Patient not found.");
  if (confirmName.trim() !== patient.full_name.trim()) {
    return fail("The name does not match. Type the patient's full name exactly to confirm deletion.");
  }

  const admin = createAdminClient();

  // 1. Uploaded files are the real storage consumers, and FK cascades won't
  //    touch Storage — remove them explicitly, scoped to this patient.
  // patient-documents (incl. EMR attachments): everything under {clinic}/{patient}/.
  const docFolder = `${clinicId}/${patientId}`;
  const { data: docFiles } = await admin.storage
    .from("patient-documents")
    .list(docFolder, { limit: 1000 });
  const docPaths = (docFiles ?? []).map((f) => `${docFolder}/${f.name}`);
  if (docPaths.length > 0) await admin.storage.from("patient-documents").remove(docPaths);

  // lab-results are keyed by lab_request id, so resolve via the patient's requests.
  const { data: labReqs } = await admin
    .from("lab_requests")
    .select("id")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId);
  const reqIds = (labReqs ?? []).map((r) => r.id);
  if (reqIds.length > 0) {
    const { data: results } = await admin
      .from("lab_results")
      .select("file_path")
      .in("lab_request_id", reqIds)
      .not("file_path", "is", null);
    const labPaths = (results ?? [])
      .map((r) => r.file_path)
      .filter((p): p is string => Boolean(p));
    if (labPaths.length > 0) await admin.storage.from("lab-results").remove(labPaths);
  }

  // 2. Delete the patient row; FK cascades clear documents, timeline,
  //    appointments, records + vitals, prescriptions + items, lab requests +
  //    results, insurance, allergies/meds/immunizations/conditions, consents,
  //    communications and tag links. Invoices/notifications keep their history
  //    with patient_id nulled out (financial records are not destroyed).
  const { error } = await admin
    .from("patients")
    .delete()
    .eq("id", patientId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/patients");
  return ok(undefined);
}

export async function addTimelineNote(input: AddTimelineNoteInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const te = await getErrorT();
  const parsed = addTimelineNoteSchema.safeParse(input);
  if (!parsed.success) {
    return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
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
  const { patientId, medicalRecordId, filePath, fileName, mimeType, sizeBytes, category } = parsed.data;

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
    category: category && category.length > 0 ? category : null,
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

// ---------------------------------------------------------------------------
// Insurance policies
// ---------------------------------------------------------------------------

/** Maps a validated insurance policy → DB columns, normalizing "" to null. */
function toInsuranceColumns(v: InsurancePolicyInput) {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  return {
    provider: v.provider,
    policy_number: orNull(v.policyNumber),
    group_number: orNull(v.groupNumber),
    coverage_start: orNull(v.coverageStart),
    coverage_end: orNull(v.coverageEnd),
    is_primary: !!v.isPrimary,
    notes: orNull(v.notes),
  };
}

export async function addInsurancePolicy(input: InsurancePolicyInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = insurancePolicySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("patient_insurance").insert({
    clinic_id: clinicId,
    patient_id: parsed.data.patientId,
    created_by: user.id,
    ...toInsuranceColumns(parsed.data),
  });
  if (error) return fail(error.message);

  revalidatePath(`/patients/${parsed.data.patientId}`);
  return ok(undefined);
}

export async function updateInsurancePolicy(
  policyId: string,
  input: InsurancePolicyInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = insurancePolicySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_insurance")
    .update(toInsuranceColumns(parsed.data))
    .eq("id", policyId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/patients/${parsed.data.patientId}`);
  return ok(undefined);
}

export async function deleteInsurancePolicy(
  policyId: string,
  patientId: string
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_insurance")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", policyId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Structured clinical lists (allergies / medications / immunizations / problems)
// ---------------------------------------------------------------------------

const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);

/** Soft-delete a row from any of the patient clinical-list tables. */
async function softDeleteClinical(
  table: "patient_allergies" | "patient_medications" | "patient_immunizations" | "patient_conditions",
  id: string,
  patientId: string
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}

export async function addAllergy(input: AllergyEntryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = allergyEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("patient_allergies").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    created_by: user.id,
    substance: v.substance,
    reaction: orNull(v.reaction),
    severity: orNull(v.severity),
    noted_at: orNull(v.notedAt),
  });
  if (error) return fail(error.message);
  revalidatePath(`/patients/${v.patientId}`);
  return ok(undefined);
}

export async function deleteAllergy(id: string, patientId: string): Promise<ActionResult> {
  return softDeleteClinical("patient_allergies", id, patientId);
}

export async function addMedication(input: MedicationEntryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = medicationEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("patient_medications").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    created_by: user.id,
    name: v.name,
    dose: orNull(v.dose),
    frequency: orNull(v.frequency),
    route: orNull(v.route),
    started_on: orNull(v.startedOn),
    ended_on: orNull(v.endedOn),
    status: v.status && v.status.length > 0 ? v.status : "active",
  });
  if (error) return fail(error.message);

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "medication",
    title: "Medication added",
    description: [v.name, v.dose, v.frequency].filter(Boolean).join(" · ") || v.name,
    created_by: user.id,
  });

  revalidatePath(`/patients/${v.patientId}`);
  return ok(undefined);
}

export async function deleteMedication(id: string, patientId: string): Promise<ActionResult> {
  return softDeleteClinical("patient_medications", id, patientId);
}

export async function addImmunization(input: ImmunizationEntryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = immunizationEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("patient_immunizations").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    created_by: user.id,
    vaccine: v.vaccine,
    dose_label: orNull(v.doseLabel),
    given_on: orNull(v.givenOn),
    next_due_on: orNull(v.nextDueOn),
    provider: orNull(v.provider),
  });
  if (error) return fail(error.message);

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "immunization",
    title: "Immunization recorded",
    description: [v.vaccine, v.doseLabel].filter(Boolean).join(" · ") || v.vaccine,
    created_by: user.id,
  });

  revalidatePath(`/patients/${v.patientId}`);
  return ok(undefined);
}

export async function deleteImmunization(id: string, patientId: string): Promise<ActionResult> {
  return softDeleteClinical("patient_immunizations", id, patientId);
}

export async function addCondition(input: ConditionEntryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = conditionEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("patient_conditions").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    created_by: user.id,
    condition: v.condition,
    status: v.status && v.status.length > 0 ? v.status : "active",
    diagnosed_on: orNull(v.diagnosedOn),
    resolved_on: orNull(v.resolvedOn),
    notes: orNull(v.notes),
  });
  if (error) return fail(error.message);
  revalidatePath(`/patients/${v.patientId}`);
  return ok(undefined);
}

export async function deleteCondition(id: string, patientId: string): Promise<ActionResult> {
  return softDeleteClinical("patient_conditions", id, patientId);
}

// ---------------------------------------------------------------------------
// Engagement: consent + segmentation tags
// ---------------------------------------------------------------------------

export async function addConsent(input: ConsentEntryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = consentEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("patient_consents").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    created_by: user.id,
    consent_type: v.consentType,
    granted: v.granted,
    signed_on: orNull(v.signedOn),
    notes: orNull(v.notes),
  });
  if (error) return fail(error.message);
  revalidatePath(`/patients/${v.patientId}`);
  return ok(undefined);
}

export async function deleteConsent(id: string, patientId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_consents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}

/** Create a tag (clinic-wide) and immediately assign it to a patient. */
export async function createAndAssignTag(
  patientId: string,
  input: CreateTagInput
): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const supabase = await createClient();

  // Reuse an existing tag of the same name, else create it.
  const { data: existing } = await supabase
    .from("patient_tags")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("name", parsed.data.name)
    .is("deleted_at", null)
    .maybeSingle();

  let tagId = existing?.id;
  if (!tagId) {
    const { data: created, error: tagErr } = await supabase
      .from("patient_tags")
      .insert({
        clinic_id: clinicId,
        created_by: user.id,
        name: parsed.data.name,
        color: parsed.data.color && parsed.data.color.length > 0 ? parsed.data.color : null,
      })
      .select("id")
      .single();
    if (tagErr || !created) return fail(tagErr?.message ?? "Could not create tag.");
    tagId = created.id;
  }

  const { error } = await supabase
    .from("patient_tag_links")
    .insert({ clinic_id: clinicId, patient_id: patientId, tag_id: tagId, created_by: user.id });
  // Ignore unique-violation when the tag is already attached.
  if (error && error.code !== "23505") return fail(error.message);

  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}

export async function assignExistingTag(input: AssignTagInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = assignTagSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid tag.");
  const supabase = await createClient();
  const { error } = await supabase.from("patient_tag_links").insert({
    clinic_id: clinicId,
    patient_id: parsed.data.patientId,
    tag_id: parsed.data.tagId,
    created_by: user.id,
  });
  if (error && error.code !== "23505") return fail(error.message);
  revalidatePath(`/patients/${parsed.data.patientId}`);
  return ok(undefined);
}

export async function unassignTag(patientId: string, tagId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_tag_links")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .eq("tag_id", tagId);
  if (error) return fail(error.message);
  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}
