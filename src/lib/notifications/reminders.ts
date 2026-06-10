import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationChannel, NotificationType } from "@/types/database";
import { formatDateTime, formatDate, timeLabel, startOfDay, addDays } from "@/lib/date";
import { dispatchNotification } from "./dispatch";
import { sendToProfile } from "./staff-send";
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
  /** The clinic's Telegram bot token (DB bot or env fallback), for Telegram sends. */
  telegramToken?: string | null;
  /** Include doctor-schedule + owner-summary sends (cron only — needs cross-user
   *  profile reads, so a service-role client). The manual RLS path leaves it off. */
  includeStaff?: boolean;
}

export interface ProcessResult {
  appointment: number;
  payment: number;
  doctor: number;
  ownerSummary: number;
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
  const result: ProcessResult = { appointment: 0, payment: 0, doctor: 0, ownerSummary: 0 };
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
        telegramToken: opts.telegramToken,
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

  // -- Staff sends (cron only; needs cross-user profile reads) ------------------
  if (opts.includeStaff) {
    if (opts.settings.doctor_schedule_enabled) {
      result.doctor = await sendDoctorSchedules(supabase, clinicId, opts, now);
    }
    if (opts.settings.owner_alerts_enabled && opts.settings.owner_daily_summary_enabled) {
      result.ownerSummary = await sendOwnerDailySummary(supabase, clinicId, opts, now);
    }
  }

  return result;
}

/**
 * Sends each doctor their own appointment list for the day. One message per
 * doctor that has a linked Telegram/email. Idempotent within the same day.
 */
export async function sendDoctorSchedules(
  supabase: DB,
  clinicId: string,
  opts: ProcessOptions,
  now: Date
): Promise<number> {
  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, scheduled_at, reason, doctor_id, patients ( full_name ), doctors ( full_name, user_id )")
    .eq("clinic_id", clinicId)
    .eq("status", "scheduled")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  type Row = {
    scheduled_at: string;
    reason: string | null;
    doctor_id: string | null;
    patients: { full_name: string } | null;
    doctors: { full_name: string; user_id: string | null } | null;
  };

  // Group by the doctor's user account.
  const byUser = new Map<string, { name: string; lines: string[] }>();
  for (const a of (appts ?? []) as unknown as Row[]) {
    const userId = a.doctors?.user_id;
    if (!userId) continue;
    const entry = byUser.get(userId) ?? { name: a.doctors?.full_name ?? "Doctor", lines: [] };
    const who = a.patients?.full_name ?? "patient";
    entry.lines.push(`${timeLabel(a.scheduled_at)} — ${who}${a.reason ? ` (${a.reason})` : ""}`);
    byUser.set(userId, entry);
  }

  let sent = 0;
  const dateLabel = formatDate(dayStart);
  for (const [userId, { name, lines }] of byUser) {
    // Dedupe: skip if a schedule already went out to this doctor today.
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("type", "doctor_schedule")
      .eq("status", "sent")
      .eq("created_by", userId)
      .gte("created_at", dayStart.toISOString());
    if ((count ?? 0) > 0) continue;

    const subject = `Your schedule for ${dateLabel} (${lines.length})`;
    const text = `Hi ${name}, your appointments for ${dateLabel}:\n${lines.map((l) => `• ${l}`).join("\n")}`;
    const html = `<p>Hi ${name}, your appointments for <strong>${dateLabel}</strong>:</p><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
    const status = await sendToProfile({
      supabase, clinicId, userId, type: "doctor_schedule",
      subject, text, html, preferred: opts.settings.default_channel, telegramToken: opts.telegramToken, loggedBy: userId,
    });
    if (status === "sent") sent++;
  }
  return sent;
}

/** Sends the clinic owner a one-line summary of the day (appointments + revenue). */
export async function sendOwnerDailySummary(
  supabase: DB,
  clinicId: string,
  opts: ProcessOptions,
  now: Date
): Promise<number> {
  const { data: clinic } = await supabase.from("clinics").select("owner_user_id").eq("id", clinicId).maybeSingle();
  const ownerId = clinic?.owner_user_id;
  if (!ownerId) return 0;

  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);

  // Dedupe: one summary per day.
  const { count: already } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("type", "owner_alert")
    .eq("status", "sent")
    .eq("created_by", ownerId)
    .gte("created_at", dayStart.toISOString());
  if ((already ?? 0) > 0) return 0;

  const [apptRes, payRes, outstandingRes] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId).gte("scheduled_at", dayStart.toISOString()).lt("scheduled_at", dayEnd.toISOString()),
    supabase.from("payments").select("amount")
      .eq("clinic_id", clinicId).gte("paid_at", dayStart.toISOString()).lt("paid_at", dayEnd.toISOString()),
    supabase.from("invoices").select("balance")
      .eq("clinic_id", clinicId).in("status", ["unpaid", "partially_paid", "overdue"]).gt("balance", 0),
  ]);

  const apptCount = apptRes.count ?? 0;
  const revenue = ((payRes.data ?? []) as { amount: number }[]).reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = ((outstandingRes.data ?? []) as { balance: number }[]).reduce((s, i) => s + Number(i.balance || 0), 0);
  const dateLabel = formatDate(dayStart);

  const subject = `${opts.clinicName || "Clinic"} — daily summary ${dateLabel}`;
  const text = `${dateLabel}: ${apptCount} appointment(s), revenue ${revenue.toFixed(2)}, outstanding ${outstanding.toFixed(2)}.`;
  const status = await sendToProfile({
    supabase, clinicId, userId: ownerId, type: "owner_alert",
    subject, text, preferred: opts.settings.default_channel, telegramToken: opts.telegramToken, loggedBy: ownerId,
  });
  return status === "sent" ? 1 : 0;
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
      telegramToken: opts.telegramToken,
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
