import "server-only";
import type { NotificationChannel, NotificationType } from "@/types/database";
import { sendEmail, sendTelegram, type SendResult } from "./send";
import { renderTemplate, type MessageTemplate } from "./templates";

export interface DispatchContact {
  email?: string | null;
  telegramChatId?: string | null;
}

export interface DispatchOutcome {
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  result: SendResult;
}

/** Pick the delivery channel given the patient's contacts and clinic preference. */
export function pickChannel(
  contact: DispatchContact,
  preferred: NotificationChannel
): { channel: NotificationChannel; recipient: string } | null {
  const email = contact.email?.trim() || "";
  const tg = contact.telegramChatId?.trim() || "";
  if (preferred === "telegram" && tg) return { channel: "telegram", recipient: tg };
  if (preferred === "email" && email) return { channel: "email", recipient: email };
  // Fall back to whichever contact the patient actually has.
  if (email) return { channel: "email", recipient: email };
  if (tg) return { channel: "telegram", recipient: tg };
  return null;
}

/**
 * Renders the right template with `vars` and delivers it over the chosen channel.
 * Pure delivery logic — the caller logs the returned outcome. `template` is a
 * resolver so the caller can supply clinic overrides per channel.
 */
export async function dispatchNotification(opts: {
  type: NotificationType;
  contact: DispatchContact;
  preferred: NotificationChannel;
  vars: Record<string, string>;
  template: (channel: NotificationChannel) => MessageTemplate;
  /** Bot token to send Telegram with (the clinic's bot, or env fallback). */
  telegramToken?: string | null;
}): Promise<DispatchOutcome> {
  const picked = pickChannel(opts.contact, opts.preferred);
  if (!picked) {
    const tpl = opts.template("email");
    return {
      channel: "email",
      recipient: "(no contact)",
      subject: tpl.subject ? renderTemplate(tpl.subject, opts.vars) : null,
      body: renderTemplate(tpl.body, opts.vars),
      result: { status: "skipped", error: "Patient has no email or Telegram contact" },
    };
  }

  const tpl = opts.template(picked.channel);
  const subject = tpl.subject ? renderTemplate(tpl.subject, opts.vars) : null;
  const body = renderTemplate(tpl.body, opts.vars);

  const result: SendResult =
    picked.channel === "telegram"
      ? await sendTelegram({ chatId: picked.recipient, text: body, token: opts.telegramToken ?? undefined })
      : await sendEmail({ to: picked.recipient, subject: subject ?? "", html: body });

  return { channel: picked.channel, recipient: picked.recipient, subject, body, result };
}
