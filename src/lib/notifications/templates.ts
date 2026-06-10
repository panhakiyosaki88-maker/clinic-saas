import type { NotificationChannel, NotificationType } from "@/types/database";

/**
 * Message templates for outbound notifications.
 *
 * A template has a `subject` (used by email; ignored by Telegram) and a `body`
 * containing `{{variable}}` placeholders. Email bodies are HTML; Telegram bodies
 * are plain text. A clinic can override any (type, channel) pair via the
 * notification_templates table — these are the built-in fallbacks.
 */
export interface MessageTemplate {
  subject: string | null;
  body: string;
}

/** The notification types that use the (clinic-editable) template system. */
export type TemplateType = "appointment_reminder" | "payment_reminder" | "follow_up" | "custom";

/** The variables each notification type exposes, for the settings UI hint. */
export const TEMPLATE_VARIABLES: Record<TemplateType, string[]> = {
  appointment_reminder: ["patient", "datetime", "clinic"],
  payment_reminder: ["patient", "invoice", "amount", "clinic"],
  follow_up: ["patient", "message", "clinic"],
  custom: ["patient", "message", "clinic"],
};

const EMAIL_DEFAULTS: Record<TemplateType, MessageTemplate> = {
  appointment_reminder: {
    subject: "Appointment reminder",
    body: "<p>Dear {{patient}},</p><p>This is a reminder of your appointment on <strong>{{datetime}}</strong>.</p><p>Thank you.</p>",
  },
  payment_reminder: {
    subject: "Payment reminder — invoice {{invoice}}",
    body: "<p>Dear {{patient}},</p><p>Our records show an outstanding balance of <strong>{{amount}}</strong> on invoice {{invoice}}.</p><p>Thank you.</p>",
  },
  follow_up: {
    subject: "Follow-up from your clinic",
    body: "<p>Dear {{patient}},</p><p>{{message}}</p>",
  },
  custom: {
    subject: "A message from your clinic",
    body: "<p>Dear {{patient}},</p><p>{{message}}</p>",
  },
};

const TELEGRAM_DEFAULTS: Record<TemplateType, MessageTemplate> = {
  appointment_reminder: {
    subject: null,
    body: "Dear {{patient}}, this is a reminder of your appointment on {{datetime}}. Thank you.",
  },
  payment_reminder: {
    subject: null,
    body: "Dear {{patient}}, our records show an outstanding balance of {{amount}} on invoice {{invoice}}. Thank you.",
  },
  follow_up: {
    subject: null,
    body: "Dear {{patient}}, {{message}}",
  },
  custom: {
    subject: null,
    body: "Dear {{patient}}, {{message}}",
  },
};

/** The built-in template for a type on a given channel. */
export function defaultTemplate(type: NotificationType, channel: NotificationChannel): MessageTemplate {
  const map = channel === "telegram" ? TELEGRAM_DEFAULTS : EMAIL_DEFAULTS;
  const key: TemplateType = type in map ? (type as TemplateType) : "custom";
  return map[key];
}

/** Replaces every {{key}} with vars[key] (missing keys become an empty string). */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
