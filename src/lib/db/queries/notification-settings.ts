import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database, NotificationChannel, NotificationType } from "@/types/database";
import { defaultTemplate, type MessageTemplate } from "@/lib/notifications/templates";

export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];
export type NotificationTemplate = Database["public"]["Tables"]["notification_templates"]["Row"];

/** Effective settings used when a clinic has not saved its own row yet. */
export const DEFAULT_SETTINGS = {
  default_channel: "email" as NotificationChannel,
  appointment_reminder_enabled: true,
  appointment_lead_hours: 24,
  payment_reminder_enabled: true,
  payment_overdue_days: 3,
  follow_up_enabled: true,
  doctor_schedule_enabled: true,
  owner_alerts_enabled: true,
  owner_daily_summary_enabled: true,
};

export type EffectiveSettings = typeof DEFAULT_SETTINGS;

/** The clinic's saved settings merged over the built-in defaults. */
export async function getNotificationSettings(): Promise<EffectiveSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  return mergeSettings(data);
}

export function mergeSettings(row: NotificationSettings | null): EffectiveSettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    default_channel: row.default_channel,
    appointment_reminder_enabled: row.appointment_reminder_enabled,
    appointment_lead_hours: row.appointment_lead_hours,
    payment_reminder_enabled: row.payment_reminder_enabled,
    payment_overdue_days: row.payment_overdue_days,
    follow_up_enabled: row.follow_up_enabled,
    doctor_schedule_enabled: row.doctor_schedule_enabled,
    owner_alerts_enabled: row.owner_alerts_enabled,
    owner_daily_summary_enabled: row.owner_daily_summary_enabled,
  };
}

/** All active, non-deleted templates for the current clinic. */
export async function listNotificationTemplates(): Promise<NotificationTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .is("deleted_at", null)
    .order("type", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * The template to use for a (type, channel): the clinic's active override if it
 * exists, otherwise the built-in default.
 */
export function resolveTemplate(
  type: NotificationType,
  channel: NotificationChannel,
  templates: Pick<NotificationTemplate, "type" | "channel" | "subject" | "body" | "is_active">[]
): MessageTemplate {
  const override = templates.find((t) => t.type === type && t.channel === channel && t.is_active);
  if (override) return { subject: override.subject, body: override.body };
  return defaultTemplate(type, channel);
}
