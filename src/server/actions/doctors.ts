"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createDoctorSchema,
  updateDoctorSchema,
  scheduleSchema,
  timeOffSchema,
  recordDoctorDocumentSchema,
  qualificationSchema,
  licenseSchema,
  type CreateDoctorInput,
  type UpdateDoctorInput,
  type ScheduleInput,
  type TimeOffInput,
  type RecordDoctorDocumentInput,
  type QualificationInput,
  type LicenseInput,
} from "@/lib/validations/doctor";
import { ok, fail, type ActionResult } from "./types";
import type { Database, Gender, EmploymentType } from "@/types/database";

type DoctorWrite = Database["public"]["Tables"]["doctors"]["Update"];

function toColumns(v: Partial<CreateDoctorInput>): DoctorWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const enumOrNull = <T>(s: string | undefined) => (s && s.length > 0 ? (s as T) : null);
  const out: DoctorWrite = {};
  if (v.fullName !== undefined) out.full_name = v.fullName;
  if (v.title !== undefined) out.title = orNull(v.title);
  if (v.specialization !== undefined) out.specialization = orNull(v.specialization);
  if (v.subSpecialty !== undefined) out.sub_specialty = orNull(v.subSpecialty);
  if (v.licenseNumber !== undefined) out.license_number = orNull(v.licenseNumber);
  if (v.phone !== undefined) out.phone = orNull(v.phone);
  if (v.email !== undefined) out.email = orNull(v.email);
  if (v.bio !== undefined) out.bio = orNull(v.bio);
  if (v.consultationFee !== undefined) out.consultation_fee = v.consultationFee ?? null;
  if (v.gender !== undefined) out.gender = enumOrNull<Gender>(v.gender);
  if (v.languages !== undefined) out.languages = orNull(v.languages);
  if (v.employmentType !== undefined) out.employment_type = enumOrNull<EmploymentType>(v.employmentType);
  if (v.yearsExperience !== undefined) out.years_experience = v.yearsExperience ?? null;
  if (v.joinedOn !== undefined) out.joined_on = orNull(v.joinedOn);
  if (v.room !== undefined) out.room = orNull(v.room);
  if (v.licenseExpiry !== undefined) out.license_expiry = orNull(v.licenseExpiry);
  if (v.licenseVerified !== undefined) out.license_verified = v.licenseVerified;
  if (v.isActive !== undefined) out.is_active = v.isActive;
  return out;
}

export async function createDoctor(
  input: CreateDoctorInput
): Promise<ActionResult<{ doctorId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = createDoctorSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .insert({
      clinic_id: clinicId,
      created_by: user.id,
      ...toColumns(parsed.data),
      full_name: parsed.data.fullName,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Could not create doctor.");

  revalidatePath("/doctors");
  return ok({ doctorId: data.id });
}

export async function updateDoctor(
  doctorId: string,
  input: UpdateDoctorInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = updateDoctorSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("doctors")
    .update(toColumns(parsed.data))
    .eq("id", doctorId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  revalidatePath("/doctors");
  return ok(undefined);
}

export async function deleteDoctor(doctorId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("doctors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", doctorId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/doctors");
  return ok(undefined);
}

export async function addSchedule(input: ScheduleInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const { doctorId, dayOfWeek, startTime, endTime, breakStart, breakEnd, slotMinutes, maxPatients } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("doctor_schedules").insert({
    clinic_id: clinicId,
    doctor_id: doctorId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    break_start: breakStart && breakStart.length > 0 ? breakStart : null,
    break_end: breakEnd && breakEnd.length > 0 ? breakEnd : null,
    slot_minutes: slotMinutes ?? null,
    max_patients: maxPatients ?? null,
  });
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

export async function deleteSchedule(scheduleId: string, doctorId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("doctor_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

export async function addTimeOff(input: TimeOffInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const { doctorId, startDate, endDate, reason } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("doctor_time_off").insert({
    clinic_id: clinicId,
    doctor_id: doctorId,
    start_date: startDate,
    end_date: endDate,
    reason: reason || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

export async function deleteTimeOff(timeOffId: string, doctorId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("doctor_time_off")
    .delete()
    .eq("id", timeOffId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Credentials: documents, avatar, qualifications, licenses
// ---------------------------------------------------------------------------

const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);

/** Records metadata after the client has uploaded the file to Storage. */
export async function recordDoctorDocument(input: RecordDoctorDocumentInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = recordDoctorDocumentSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid document data.");
  const { doctorId, filePath, fileName, mimeType, sizeBytes, category } = parsed.data;

  // The file path must live under this clinic's namespace.
  if (!filePath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  const { error } = await supabase.from("doctor_documents").insert({
    clinic_id: clinicId,
    doctor_id: doctorId,
    file_path: filePath,
    file_name: fileName,
    mime_type: mimeType ?? null,
    size_bytes: sizeBytes ?? null,
    category: category && category.length > 0 ? category : null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

export async function deleteDoctorDocument(documentId: string, doctorId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("doctor_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!doc) return fail("Document not found.");

  await supabase.storage.from("doctor-documents").remove([doc.file_path]);
  const { error } = await supabase
    .from("doctor_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

/** Sets (or clears) the doctor's avatar path after a client upload to Storage. */
export async function setDoctorAvatar(doctorId: string, avatarPath: string | null): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  if (avatarPath && !avatarPath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  // Best-effort removal of the previous avatar object.
  if (avatarPath) {
    const { data: prev } = await supabase
      .from("doctors")
      .select("avatar_path")
      .eq("id", doctorId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (prev?.avatar_path && prev.avatar_path !== avatarPath) {
      await supabase.storage.from("doctor-avatars").remove([prev.avatar_path]);
    }
  }

  const { error } = await supabase
    .from("doctors")
    .update({ avatar_path: avatarPath })
    .eq("id", doctorId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

export async function addQualification(input: QualificationInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = qualificationSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_qualifications").insert({
    clinic_id: clinicId,
    doctor_id: v.doctorId,
    created_by: user.id,
    degree: v.degree,
    institution: orNull(v.institution),
    field: orNull(v.field),
    year: v.year ?? null,
    notes: orNull(v.notes),
  });
  if (error) return fail(error.message);
  revalidatePath(`/doctors/${v.doctorId}`);
  return ok(undefined);
}

export async function deleteQualification(id: string, doctorId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("doctor_qualifications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}

export async function addLicense(input: LicenseInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const parsed = licenseSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("doctor_licenses").insert({
    clinic_id: clinicId,
    doctor_id: v.doctorId,
    created_by: user.id,
    license_number: v.licenseNumber,
    authority: orNull(v.authority),
    jurisdiction: orNull(v.jurisdiction),
    issued_on: orNull(v.issuedOn),
    expiry_on: orNull(v.expiryOn),
    verified: !!v.verified,
  });
  if (error) return fail(error.message);
  revalidatePath(`/doctors/${v.doctorId}`);
  return ok(undefined);
}

export async function deleteLicense(id: string, doctorId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.DOCTORS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("doctor_licenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(`/doctors/${doctorId}`);
  return ok(undefined);
}
