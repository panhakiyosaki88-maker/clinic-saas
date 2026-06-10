import { z } from "zod";

export const notificationSettingsSchema = z.object({
  defaultChannel: z.enum(["email", "telegram"]),
  appointmentReminderEnabled: z.boolean(),
  appointmentLeadHours: z.coerce.number().int().min(1).max(336), // up to 14 days
  paymentReminderEnabled: z.boolean(),
  paymentOverdueDays: z.coerce.number().int().min(0).max(365),
  followUpEnabled: z.boolean(),
  doctorScheduleEnabled: z.boolean(),
  ownerAlertsEnabled: z.boolean(),
  ownerDailySummaryEnabled: z.boolean(),
});
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

export const notificationTemplateSchema = z.object({
  type: z.enum(["appointment_reminder", "payment_reminder", "follow_up", "custom"]),
  channel: z.enum(["email", "telegram"]),
  subject: z.string().trim().max(255).optional().or(z.literal("")),
  body: z.string().trim().min(1, "notification.bodyRequired").max(10000),
});
export type NotificationTemplateInput = z.infer<typeof notificationTemplateSchema>;
