import "server-only";

export interface SendResult {
  status: "sent" | "failed" | "skipped";
  error?: string;
}

/**
 * Sends an email via the Resend HTTP API (no SDK dependency). If RESEND_API_KEY
 * is not configured, returns `skipped` so the app works in test/dev without keys.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Clinic SaaS <onboarding@resend.dev>";
  if (!apiKey) return { status: "skipped", error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { status: "failed", error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Email send failed" };
  }
}

/**
 * Sends a Telegram message via the Bot API. `chatId` is the recipient's chat id.
 * Skipped when TELEGRAM_BOT_TOKEN is not configured.
 */
export async function sendTelegram(opts: { chatId: string; text: string }): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { status: "skipped", error: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: opts.chatId, text: opts.text }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { status: "failed", error: `Telegram ${res.status}: ${text.slice(0, 200)}` };
    }
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Telegram send failed" };
  }
}
