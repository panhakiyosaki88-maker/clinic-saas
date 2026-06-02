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
  type CreateDoctorInput,
  type UpdateDoctorInput,
  type ScheduleInput,
  type TimeOffInput,
} from "@/lib/validations/doctor";
import { ok, fail, type ActionResult } from "./types";
import type { Database } from "@/types/database";

type DoctorWrite = Database["public"]["Tables"]["doctors"]["Update"];

function toColumns(v: Partial<CreateDoctorInput>): DoctorWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const out: DoctorWrite = {};
  if (v.fullName !== undefined) out.full_name = v.fullName;
  if (v.specialization !== undefined) out.specialization = orNull(v.specialization);
  if (v.licenseNumber !== undefined) out.license_number = orNull(v.licenseNumber);
  if (v.phone !== undefined) out.phone = orNull(v.phone);
  if (v.email !== undefined) out.email = orNull(v.email);
  if (v.bio !== undefined) out.bio = orNull(v.bio);
  if (v.consultationFee !== undefined) out.consultation_fee = v.consultationFee ?? null;
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
  const { doctorId, dayOfWeek, startTime, endTime } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("doctor_schedules").insert({
    clinic_id: clinicId,
    doctor_id: doctorId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
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
