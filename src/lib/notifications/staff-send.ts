import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationChannel, NotificationType } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickChannel } from "./dispatch";
import { sendEmail, sendTelegram } from "./send";
import { getTelegramConfig } from "./telegram-config";

type DB = SupabaseClient<Database>;

export interface ProfileContact {
  id: string;
  full_name: string | null;
  email: string | null;
  telegram_chat_id: string | null;
}

export async function getProfileContact(supabase: DB, userId: string): Promise<ProfileContact | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, telegram_chat_id")
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileContact | null) ?? null;
}

/**
 * Delivers a message to a single staff user over their preferred channel and
 * records it in the notifications log. Channel is chosen the same way as patient
 * sends (clinic default, falling back to whatever contact exists).
 */
export async function sendToProfile(opts: {
  supabase: DB;
  clinicId: string;
  userId: string;
  type: NotificationType;
  subject: string;
  text: string;
  html?: string;
  preferred: NotificationChannel;
  telegramToken?: string | null;
  loggedBy?: string | null;
}): Promise<"sent" | "failed" | "skipped"> {
  const contact = await getProfileContact(opts.supabase, opts.userId);
  const picked = contact
    ? pickChannel({ email: contact.email, telegramChatId: contact.telegram_chat_id }, opts.preferred)
    : null;

  let channel: NotificationChannel = "email";
  let recipient = "(no contact)";
  let result: { status: "sent" | "failed" | "skipped"; error?: string };

  if (!picked) {
    result = { status: "skipped", error: "Staff member has no email or Telegram contact" };
  } else {
    channel = picked.channel;
    recipient = picked.recipient;
    result =
      channel === "telegram"
        ? await sendTelegram({ chatId: recipient, text: opts.text, token: opts.telegramToken ?? undefined })
        : await sendEmail({ to: recipient, subject: opts.subject, html: opts.html ?? `<p>${opts.text}</p>` });
  }

  await opts.supabase.from("notifications").insert({
    clinic_id: opts.clinicId,
    channel,
    type: opts.type,
    recipient,
    subject: opts.subject,
    body: opts.html ?? opts.text,
    status: result.status,
    error: result.error ?? null,
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
    created_by: opts.loggedBy ?? null,
  });

  return result.status;
}

/**
 * Sends a business alert to the clinic owner (resolved via clinics.owner_user_id),
 * respecting the owner_alerts_enabled toggle. Uses the service-role client so it
 * works regardless of who triggered the originating event (RLS-safe).
 */
export async function notifyClinicOwner(opts: {
  clinicId: string;
  type: NotificationType;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const admin = createAdminClient();

  const [{ data: clinic }, { data: settings }] = await Promise.all([
    admin.from("clinics").select("owner_user_id").eq("id", opts.clinicId).maybeSingle(),
    admin.from("notification_settings").select("owner_alerts_enabled, default_channel").eq("clinic_id", opts.clinicId).maybeSingle(),
  ]);

  const ownerId = clinic?.owner_user_id;
  if (!ownerId) return;
  if (settings && settings.owner_alerts_enabled === false) return;

  const tg = await getTelegramConfig(admin, opts.clinicId);
  await sendToProfile({
    supabase: admin,
    clinicId: opts.clinicId,
    userId: ownerId,
    type: opts.type,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    preferred: (settings?.default_channel as NotificationChannel) ?? "email",
    telegramToken: tg.botToken,
  });
}
