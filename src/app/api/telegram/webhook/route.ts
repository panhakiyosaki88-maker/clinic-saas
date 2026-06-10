import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLinkToken } from "@/lib/notifications/telegram-link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reply to a chat via the Bot API (best-effort; ignores failures). */
async function reply(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
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
 * Telegram webhook. Registered with a `secret_token`, which Telegram echoes back
 * in the `X-Telegram-Bot-Api-Secret-Token` header — we reject anything else.
 *
 * Handles:
 *   /start <token>  → link this chat to the encoded patient/user account
 *   /start          → help text
 *   /stop           → unlink this chat from any account
 */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? "").trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  if (text === "/stop") {
    // Detach this chat from whatever account it was linked to.
    await admin.from("patients").update({ telegram_chat_id: null }).eq("telegram_chat_id", String(chatId));
    await admin.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", String(chatId));
    await reply(chatId, "You've been unsubscribed. You won't receive further messages here.");
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    if (!payload) {
      await reply(chatId, "Welcome! Open the “Connect Telegram” link from your clinic to finish linking this chat.");
      return NextResponse.json({ ok: true });
    }

    const decoded = verifyLinkToken(payload);
    if (!decoded) {
      await reply(chatId, "That link is invalid or expired. Please use a fresh “Connect Telegram” link from your clinic.");
      return NextResponse.json({ ok: true });
    }

    const table = decoded.kind === "patient" ? "patients" : "profiles";
    const { error } = await admin.from(table).update({ telegram_chat_id: String(chatId) }).eq("id", decoded.id);
    await reply(
      chatId,
      error
        ? "Sorry, something went wrong linking your account. Please try again later."
        : "✅ Connected. You'll now receive reminders and messages here."
    );
    return NextResponse.json({ ok: true });
  }

  // Any other message — gentle nudge.
  await reply(chatId, "Send /start with your clinic's Connect link to receive messages, or /stop to unsubscribe.");
  return NextResponse.json({ ok: true });
}
