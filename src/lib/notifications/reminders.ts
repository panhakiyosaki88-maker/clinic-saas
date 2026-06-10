import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationChannel, NotificationType } from "@/types/database";
import { formatDateTime } from "@/lib/date";
import { dispatchNotification } from "./dispatch";
import { resolveTemplate, type EffectiveSettings, type NotificationTemplate } from "@/lib/db/queries/notification-settings";

type DB = SupabaseClient<Database>;

interface PatientContact {
  full_name: string;
  email: string | null;
  telegram_chat_id: string | null;
}

export interface ProcessOptions {
  settings: EffectiveSettings;
  templates: Pick<NotificationTemplate, "type" | "channel" | "subject" | "body" | "is_active">[];
  clinicName: string;
  userId: string | null;
  now?: Date;
}

export interface ProcessResult {
  appointment: number;
  payment: number;
}

/** True when a 'sent' notification of `type` already exists for this row. */
async function alreadySent(
  supabase: DB,
  clinicId: string,
  type: NotificationType,
  key: { appointmentId?: string; invoiceId?: string }
): Promise<boolean> {
  let q = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("type", type)
    .eq("status", "sent");
  if (key.appointmentId) q = q.eq("appointment_id", key.appointmentId);
  if (key.invoiceId) q = q.eq("invoice_id", key.invoiceId);
  const { count } = await q;
  return (count ?? 0) > 0;
}

async function logOutcome(
  supabase: DB,
  row: {
    clinicId: string;
    channel: NotificationChannel;
    type: NotificationType;
    recipient: string;
    subject: string | null;
    body: string;
    status: string;
    error: string | null;
    patientId: string | null;
    appointmentId?: string | null;
    invoiceId?: string | null;
    userId: string | null;
  }
) {
  await supabase.from("notifications").insert({
    clinic_id: row.clinicId,
    channel: row.channel,
    type: row.type,
    recipient: row.recipient || "(no contact)",
    subject: row.subject,
    body: row.body,
    status: row.status as Database["public"]["Tables"]["notifications"]["Insert"]["status"],
    error: row.error,
    patient_id: row.patientId,
    appointment_id: row.appointmentId ?? null,
    invoice_id: row.invoiceId ?? null,
    sent_at: row.status === "sent" ? new Date().toISOString() : null,
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
    created_by: row.userId,
  });
}

/**
 * Sends any due appointment & payment reminders for one clinic that haven't
 * already been sent. Idempotent — safe to run repeatedly (cron or manual).
 * Works with either the RLS client (current clinic) or the admin client (cron).
 */
export async function processClinicReminders(
  supabase: DB,
  clinicId: string,
  opts: ProcessOptions
): Promise<ProcessResult> {
  const now = opts.now ?? new Date();
  const result: ProcessResult = { appointment: 0, payment: 0 };
  const resolver = (type: NotificationType) => (channel: NotificationChannel) =>
    resolveTemplate(type, channel, opts.templates);

  // -- Appointment reminders: upcoming within the lead window ------------------
  if (opts.settings.appointment_reminder_enabled) {
    const windowEnd = new Date(now.getTime() + opts.settings.appointment_lead_hours * 3600_000);
    result.appointment = await sendAppointmentRemindersInWindow(
      supabase,
      clinicId,
      opts,
      now.toISOString(),
      windowEnd.toISOString()
    );
  }

  // -- Payment reminders: overdue unpaid invoices ------------------------------
  if (opts.settings.payment_reminder_enabled) {
    const cutoff = new Date(now.getTime() - opts.settings.payment_overdue_days * 86_400_000);
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, balance, patient_id, patients ( full_name, email, telegram_chat_id )")
      .eq("clinic_id", clinicId)
      .in("status", ["unpaid", "partially_paid", "overdue"])
      .gt("balance", 0)
      .lte("issued_at", cutoff.toISOString());

    for (const inv of (invoices ?? []) as unknown as {
      id: string;
      invoice_number: string;
      balance: number;
      patient_id: string | null;
      patients: PatientContact | null;
    }[]) {
      if (await alreadySent(supabase, clinicId, "payment_reminder", { invoiceId: inv.id })) continue;
      const p = inv.patients;
      const outcome = await dispatchNotification({
        type: "payment_reminder",
        contact: { email: p?.email, telegramChatId: p?.telegram_chat_id },
        preferred: opts.settings.default_channel,
        vars: {
          patient: p?.full_name ?? "patient",
          invoice: inv.invoice_number,
          amount: Number(inv.balance).toFixed(2),
          clinic: opts.clinicName,
        },
        template: resolver("payment_reminder"),
      });
      await logOutcome(supabase, {
        clinicId, channel: outcome.channel, type: "payment_reminder",
        recipient: outcome.recipient, subject: outcome.subject, body: outcome.body,
        status: outcome.result.status, error: outcome.result.error ?? null,
        patientId: inv.patient_id, invoiceId: inv.id, userId: opts.userId,
      });
      if (outcome.result.status === "sent") result.payment++;
    }
  }

  return result;
}

/**
 * Sends appointment reminders for every still-scheduled appointment whose
 * `scheduled_at` falls in [startISO, endISO), skipping any already reminded.
 * Returns the number actually sent. Shared by the scheduled sweep (lead window)
 * and the explicit "remind tomorrow's appointments" button (a day window).
 */
export async function sendAppointmentRemindersInWindow(
  supabase: DB,
  clinicId: string,
  opts: ProcessOptions,
  startISO: string,
  endISO: string
): Promise<number> {
  let sent = 0;
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, scheduled_at, patient_id, patients ( full_name, email, telegram_chat_id )")
    .eq("clinic_id", clinicId)
    .eq("status", "scheduled")
    .gte("scheduled_at", startISO)
    .lt("scheduled_at", endISO);

  for (const a of (appts ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    patient_id: string | null;
    patients: PatientContact | null;
  }[]) {
    if (await alreadySent(supabase, clinicId, "appointment_reminder", { appointmentId: a.id })) continue;
    const p = a.patients;
    const outcome = await dispatchNotification({
      type: "appointment_reminder",
      contact: { email: p?.email, telegramChatId: p?.telegram_chat_id },
      preferred: opts.settings.default_channel,
      vars: { patient: p?.full_name ?? "patient", datetime: formatDateTime(a.scheduled_at), clinic: opts.clinicName },
      template: (channel) => resolveTemplate("appointment_reminder", channel, opts.templates),
    });
    await logOutcome(supabase, {
      clinicId, channel: outcome.channel, type: "appointment_reminder",
      recipient: outcome.recipient, subject: outcome.subject, body: outcome.body,
      status: outcome.result.status, error: outcome.result.error ?? null,
      patientId: a.patient_id, appointmentId: a.id, userId: opts.userId,
    });
    if (outcome.result.status === "sent") sent++;
  }
  return sent;
}
