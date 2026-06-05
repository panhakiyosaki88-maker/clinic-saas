"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
  type ChangeStatusInput,
} from "@/lib/validations/appointment";
import { ok, fail, type ActionResult } from "./types";
import { ymd } from "@/lib/date";
import type { Database } from "@/types/database";

type AppointmentWrite = Database["public"]["Tables"]["appointments"]["Update"];

/** One calendar day's appointment load + the doctors booked that day. */
export interface CalendarDay {
  count: number;
  doctors: { name: string; avatarPath: string | null }[];
}

/**
 * Per-day appointment summary within [fromISO, toISO): a count plus the
 * (deduped) doctors booked each day. Powers the dashboard calendar's month
 * navigation without reloading the whole page.
 */
export async function getAppointmentCalendar(
  fromISO: string,
  toISO: string
): Promise<ActionResult<{ days: Record<string, CalendarDay> }>> {
  await requirePermission(PERMISSIONS.APPOINTMENTS_READ);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("scheduled_at, doctors ( full_name, avatar_path )")
    .is("deleted_at", null)
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);
  if (error) return fail(error.message);

  const rows = (data ?? []) as unknown as {
    scheduled_at: string;
    doctors: { full_name: string; avatar_path: string | null } | null;
  }[];

  const days: Record<string, CalendarDay> = {};
  for (const r of rows) {
    const key = ymd(new Date(r.scheduled_at));
    const day = (days[key] ??= { count: 0, doctors: [] });
    day.count += 1;
    const doc = r.doctors;
    if (doc && !day.doctors.some((d) => d.name === doc.full_name)) {
      day.doctors.push({ name: doc.full_name, avatarPath: doc.avatar_path });
    }
  }
  return ok({ days });
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<ActionResult<{ appointmentId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const now = new Date().toISOString();
  const isWalkIn = !!v.isWalkIn;
  const scheduledAt = isWalkIn ? now : combineDateTime(v.scheduledDate!, v.scheduledTime!);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: v.patientId,
      doctor_id: v.doctorId || null,
      branch_id: v.branchId || null,
      scheduled_at: scheduledAt,
      duration_minutes: v.durationMinutes,
      is_walk_in: isWalkIn,
      // Walk-ins join the queue immediately.
      status: isWalkIn ? "waiting" : "scheduled",
      checked_in_at: isWalkIn ? now : null,
      reason: v.reason || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Could not create appointment.");

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "appointment",
    title: isWalkIn ? "Walk-in registered" : "Appointment scheduled",
    description: v.reason || null,
    created_by: user.id,
  });

  revalidatePath("/appointments");
  return ok({ appointmentId: data.id });
}

export async function updateAppointment(
  appointmentId: string,
  input: UpdateAppointmentInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const parsed = updateAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const patch: AppointmentWrite = {};
  if (v.doctorId !== undefined) patch.doctor_id = v.doctorId || null;
  if (v.branchId !== undefined) patch.branch_id = v.branchId || null;
  if (v.durationMinutes !== undefined) patch.duration_minutes = v.durationMinutes;
  if (v.reason !== undefined) patch.reason = v.reason || null;
  if (v.notes !== undefined) patch.notes = v.notes || null;
  if (v.scheduledDate && v.scheduledTime) {
    patch.scheduled_at = combineDateTime(v.scheduledDate, v.scheduledTime);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", appointmentId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${appointmentId}`);
  return ok(undefined);
}

/** Advances the lifecycle and stamps the matching timestamp. */
export async function changeAppointmentStatus(input: ChangeStatusInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const parsed = changeStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { appointmentId, status } = parsed.data;

  const now = new Date().toISOString();
  const patch: AppointmentWrite = { status };
  if (status === "waiting") patch.checked_in_at = now;
  else if (status === "in_consultation") patch.started_at = now;
  else if (status === "completed") patch.completed_at = now;

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", appointmentId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${appointmentId}`);
  return ok(undefined);
}

export async function deleteAppointment(appointmentId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/appointments");
  return ok(undefined);
}
