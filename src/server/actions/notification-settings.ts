"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  notificationSettingsSchema,
  notificationTemplateSchema,
  type NotificationSettingsInput,
  type NotificationTemplateInput,
} from "@/lib/validations/notification";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";
import type { NotificationChannel, NotificationType } from "@/types/database";

/** Upserts the clinic's notification settings (one row per clinic). */
export async function saveNotificationSettings(input: NotificationSettingsInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("notification_settings").upsert(
    {
      clinic_id: clinicId,
      default_channel: v.defaultChannel,
      appointment_reminder_enabled: v.appointmentReminderEnabled,
      appointment_lead_hours: v.appointmentLeadHours,
      payment_reminder_enabled: v.paymentReminderEnabled,
      payment_overdue_days: v.paymentOverdueDays,
      follow_up_enabled: v.followUpEnabled,
      doctor_schedule_enabled: v.doctorScheduleEnabled,
      owner_alerts_enabled: v.ownerAlertsEnabled,
      owner_daily_summary_enabled: v.ownerDailySummaryEnabled,
      created_by: user.id,
    },
    { onConflict: "clinic_id" }
  );
  if (error) return fail(error.message);

  revalidatePath("/settings/notifications");
  return ok(undefined);
}

/** Upserts a per-(type, channel) message template override for the clinic. */
export async function saveNotificationTemplate(input: NotificationTemplateInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = notificationTemplateSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("notification_templates").upsert(
    {
      clinic_id: clinicId,
      type: v.type,
      channel: v.channel,
      subject: v.subject || null,
      body: v.body,
      is_active: true,
      deleted_at: null,
      created_by: user.id,
    },
    { onConflict: "clinic_id,type,channel" }
  );
  if (error) return fail(error.message);

  revalidatePath("/settings/notifications");
  return ok(undefined);
}

/** Reverts a template override to the built-in default (soft delete). */
export async function resetNotificationTemplate(
  type: NotificationType,
  channel: NotificationChannel
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_templates")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("clinic_id", clinicId)
    .eq("type", type)
    .eq("channel", channel);
  if (error) return fail(error.message);

  revalidatePath("/settings/notifications");
  return ok(undefined);
}
