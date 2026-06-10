import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLinkToken } from "@/lib/notifications/telegram-link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reply to a chat via the Bot API (best-effort; ignores failures). */
async function reply(token: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // ignore — webhook must still return 200
  }
}

/**
 * Telegram webhook. Each clinic's bot is registered with its own `secret_token`,
 * which Telegram echoes back in `X-Telegram-Bot-Api-Secret-Token`. We use that to
 * find the owning clinic (and its bot token + link secret); the platform env bot
 * is also accepted as a fallback. Then:
 *   /start <token>  → link this chat to the encoded patient/user account
 *   /start          → help text
 *   /stop           → unlink this chat from any account
 */
export async function POST(request: Request) {
  const header = request.headers.get("x-telegram-bot-api-secret-token");
  if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Resolve the bot token + link secret for this update from the secret header.
  let botToken: string | null = null;
  let linkSecret: string | null = null;
  const envSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (envSecret && header === envSecret) {
    botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    linkSecret = process.env.TELEGRAM_LINK_SECRET || null;
  } else {
    const { data } = await admin
      .from("notification_settings")
      .select("telegram_bot_token, telegram_link_secret")
      .eq("telegram_webhook_secret", header)
      .maybeSingle();
    botToken = data?.telegram_bot_token ?? null;
    linkSecret = data?.telegram_link_secret ?? null;
  }
  if (!botToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? "").trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  if (text === "/stop") {
    await admin.from("patients").update({ telegram_chat_id: null }).eq("telegram_chat_id", String(chatId));
    await admin.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", String(chatId));
    await reply(botToken, chatId, "You've been unsubscribed. You won't receive further messages here.");
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    if (!payload) {
      await reply(botToken, chatId, "Welcome! Open the “Connect Telegram” link from your clinic to finish linking this chat.");
      return NextResponse.json({ ok: true });
    }

    const decoded = verifyLinkToken(linkSecret, payload);
    if (!decoded) {
      await reply(botToken, chatId, "That link is invalid or expired. Please use a fresh “Connect Telegram” link from your clinic.");
      return NextResponse.json({ ok: true });
    }

    const table = decoded.kind === "patient" ? "patients" : "profiles";
    const { error } = await admin.from(table).update({ telegram_chat_id: String(chatId) }).eq("id", decoded.id);
    await reply(
      botToken,
      chatId,
      error
        ? "Sorry, something went wrong linking your account. Please try again later."
        : "✅ Connected. You'll now receive reminders and messages here."
    );
    return NextResponse.json({ ok: true });
  }

  await reply(botToken, chatId, "Send /start with your clinic's Connect link to receive messages, or /stop to unsubscribe.");
  return NextResponse.json({ ok: true });
}
