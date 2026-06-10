"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { sendEmail, sendTelegram, type SendResult } from "@/lib/notifications/send";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  getNotificationSettings,
  listNotificationTemplates,
  resolveTemplate,
  type EffectiveSettings,
  type NotificationTemplate,
} from "@/lib/db/queries/notification-settings";
import { processClinicReminders, sendAppointmentRemindersInWindow } from "@/lib/notifications/reminders";
import { startOfDay, addDays } from "@/lib/date";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";
import type { NotificationChannel, NotificationType } from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

interface PatientContact {
  full_name: string;
  email: string | null;
  telegram_chat_id: string | null;
}

/** Loads the clinic's delivery config (channel preference + templates + name). */
async function loadConfig(
  supabase: SupabaseServer,
  clinicId: string
): Promise<{ settings: EffectiveSettings; templates: NotificationTemplate[]; clinicName: string }> {
  const [settings, templates, clinicRes] = await Promise.all([
    getNotificationSettings(),
    listNotificationTemplates(),
    supabase.from("clinics").select("name").eq("id", clinicId).maybeSingle(),
  ]);
  return { settings, templates, clinicName: clinicRes.data?.name ?? "" };
}

interface LogArgs {
  clinicId: string;
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  subject: string | null;
  body: string;
  result: SendResult;
  patientId?: string | null;
  appointmentId?: string | null;
  invoiceId?: string | null;
}

/** Records the outcome in the notifications log (audit trail). */
async function logNotification(supabase: SupabaseServer, args: LogArgs) {
  await supabase.from("notifications").insert({
    clinic_id: args.clinicId,
    channel: args.channel,
    type: args.type,
    recipient: args.recipient || "(no contact)",
    subject: args.subject,
    body: args.body,
    status: args.result.status,
    error: args.result.error ?? null,
    patient_id: args.patientId ?? null,
    appointment_id: args.appointmentId ?? null,
    invoice_id: args.invoiceId ?? null,
    sent_at: args.result.status === "sent" ? new Date().toISOString() : null,
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
    created_by: args.userId,
  });
}

export async function sendAppointmentReminder(
  appointmentId: string
): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = z.string().uuid().safeParse(appointmentId);
  if (!parsed.success) return fail(te("appointment.invalid"));

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, scheduled_at, patient_id, patients ( full_name, email, telegram_chat_id )")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!data) return fail(te("appointment.notFound"));

  const patient = (data as unknown as { patients: PatientContact | null }).patients;
  const { settings, templates, clinicName } = await loadConfig(supabase, clinicId);
  const { formatDateTime } = await import("@/lib/date");

  const outcome = await dispatchNotification({
    type: "appointment_reminder",
    contact: { email: patient?.email, telegramChatId: patient?.telegram_chat_id },
    preferred: settings.default_channel,
    vars: { patient: patient?.full_name ?? "patient", datetime: formatDateTime(data.scheduled_at), clinic: clinicName },
    template: (channel) => resolveTemplate("appointment_reminder", channel, templates),
  });

  await logNotification(supabase, {
    clinicId, userId: user.id, channel: outcome.channel, type: "appointment_reminder",
    recipient: outcome.recipient, subject: outcome.subject, body: outcome.body, result: outcome.result,
    patientId: data.patient_id, appointmentId: data.id,
  });

  revalidatePath("/notifications");
  return ok({ status: outcome.result.status });
}

export async function sendPaymentReminder(
  invoiceId: string
): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = z.string().uuid().safeParse(invoiceId);
  if (!parsed.success) return fail(te("invoice.invalid"));

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, balance, patient_id, patients ( full_name, email, telegram_chat_id )")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!data) return fail(te("invoice.notFound"));

  const patient = (data as unknown as { patients: PatientContact | null }).patients;
  const { settings, templates, clinicName } = await loadConfig(supabase, clinicId);

  const outcome = await dispatchNotification({
    type: "payment_reminder",
    contact: { email: patient?.email, telegramChatId: patient?.telegram_chat_id },
    preferred: settings.default_channel,
    vars: {
      patient: patient?.full_name ?? "patient",
      invoice: data.invoice_number,
      amount: Number(data.balance).toFixed(2),
      clinic: clinicName,
    },
    template: (channel) => resolveTemplate("payment_reminder", channel, templates),
  });

  await logNotification(supabase, {
    clinicId, userId: user.id, channel: outcome.channel, type: "payment_reminder",
    recipient: outcome.recipient, subject: outcome.subject, body: outcome.body, result: outcome.result,
    patientId: data.patient_id, invoiceId: data.id,
  });

  revalidatePath("/notifications");
  return ok({ status: outcome.result.status });
}

const followUpSchema = z.object({
  patientId: z.string().uuid(),
  message: z.string().trim().min(1, "notification.enterMessage").max(2000),
});

export async function sendFollowUp(input: { patientId: string; message: string }): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email, telegram_chat_id")
    .eq("id", parsed.data.patientId)
    .maybeSingle();
  if (!patient) return fail(te("patient.notFound"));

  const { settings, templates, clinicName } = await loadConfig(supabase, clinicId);

  const outcome = await dispatchNotification({
    type: "follow_up",
    contact: { email: patient.email, telegramChatId: patient.telegram_chat_id },
    preferred: settings.default_channel,
    vars: { patient: patient.full_name, message: parsed.data.message, clinic: clinicName },
    template: (channel) => resolveTemplate("follow_up", channel, templates),
  });

  await logNotification(supabase, {
    clinicId, userId: user.id, channel: outcome.channel, type: "follow_up",
    recipient: outcome.recipient, subject: outcome.subject, body: outcome.body, result: outcome.result,
    patientId: patient.id,
  });

  // Mirror the send into the patient's communication log (Module 4, Phase 3).
  await supabase.from("patient_communications").insert({
    clinic_id: clinicId,
    patient_id: patient.id,
    channel: outcome.channel,
    direction: "outbound",
    subject: outcome.subject,
    body: parsed.data.message,
    status: outcome.result.status,
    created_by: user.id,
  });

  revalidatePath("/notifications");
  revalidatePath(`/patients/${patient.id}`);
  return ok({ status: outcome.result.status });
}

/** Re-sends a previously failed/skipped notification using its stored content. */
export async function retryNotification(notificationId: string): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = z.string().uuid().safeParse(notificationId);
  if (!parsed.success) return fail(te("fixFields"));

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("notifications")
    .select("id, channel, recipient, subject, body, attempts")
    .eq("id", notificationId)
    .maybeSingle();
  if (!row) return fail(te("notFound"));

  const hasRecipient = row.recipient && row.recipient !== "(no contact)";
  const result: SendResult = !hasRecipient
    ? { status: "skipped", error: "No recipient on record" }
    : row.channel === "telegram"
      ? await sendTelegram({ chatId: row.recipient, text: row.body })
      : await sendEmail({ to: row.recipient, subject: row.subject ?? "", html: row.body });

  await supabase
    .from("notifications")
    .update({
      status: result.status,
      error: result.error ?? null,
      attempts: (row.attempts ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", notificationId)
    .eq("clinic_id", clinicId);

  revalidatePath("/notifications");
  return ok({ status: result.status });
}

/** Flushes all due appointment & payment reminders for the current clinic now. */
export async function runDueReminders(): Promise<ActionResult<{ appointment: number; payment: number }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const supabase = await createClient();
  const { settings, templates, clinicName } = await loadConfig(supabase, clinicId);

  const counts = await processClinicReminders(supabase, clinicId, {
    settings, templates, clinicName, userId: user.id,
  });

  revalidatePath("/notifications");
  return ok(counts);
}

/**
 * Explicitly reminds every still-scheduled appointment for tomorrow, regardless
 * of the configured lead window. Idempotent — appointments already reminded are
 * skipped. The day window is computed in the server's local time.
 */
export async function remindTomorrowsAppointments(): Promise<ActionResult<{ count: number }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const supabase = await createClient();
  const { settings, templates, clinicName } = await loadConfig(supabase, clinicId);

  const todayStart = startOfDay(new Date());
  const count = await sendAppointmentRemindersInWindow(
    supabase,
    clinicId,
    { settings, templates, clinicName, userId: user.id },
    addDays(todayStart, 1).toISOString(),
    addDays(todayStart, 2).toISOString()
  );

  revalidatePath("/notifications");
  return ok({ count });
}
