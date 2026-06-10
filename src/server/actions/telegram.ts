"use server";

import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClinic } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { LinkKind } from "@/lib/notifications/telegram-link";
import { getTelegramConfig } from "@/lib/notifications/telegram-config";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT } from "@/lib/i18n/action-errors";

/**
 * Detaches a Telegram chat from an account. Users may disconnect their own
 * profile; disconnecting a patient requires patients.write.
 */
export async function disconnectTelegram(kind: LinkKind, id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (kind === "user") {
    const { user } = await requireClinic();
    if (id !== user.id) return fail("You can only disconnect your own Telegram.");
    const { error } = await supabase.from("profiles").update({ telegram_chat_id: null }).eq("id", user.id);
    if (error) return fail(error.message);
    revalidatePath("/settings/notifications");
    return ok(undefined);
  }

  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const { error } = await supabase
    .from("patients")
    .update({ telegram_chat_id: null })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(`/patients/${id}`);
  return ok(undefined);
}

const botConfigSchema = z.object({
  // BotFather tokens look like 123456789:AA... — keep the check lenient.
  token: z.string().trim().regex(/^\d{6,}:[A-Za-z0-9_-]{20,}$/, "notification.invalidBotToken"),
  username: z.string().trim().min(3).max(64),
});

/** Saves (or updates) the clinic's own Telegram bot. Owner-managed in Settings. */
export async function saveTelegramBotConfig(input: { token: string; username: string }): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const te = await getErrorT();
  const parsed = botConfigSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const key = first.token?.[0] ?? first.username?.[0] ?? "fixFields";
    return fail(te(key));
  }
  const username = parsed.data.username.replace(/^@/, "");

  const supabase = await createClient();
  // Preserve existing secrets so previously issued links / webhook keep working.
  const { data: existing } = await supabase
    .from("notification_settings")
    .select("telegram_webhook_secret, telegram_link_secret")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  const webhookSecret = existing?.telegram_webhook_secret || crypto.randomBytes(32).toString("base64url");
  const linkSecret = existing?.telegram_link_secret || crypto.randomBytes(32).toString("base64url");

  const { error } = await supabase.from("notification_settings").upsert(
    {
      clinic_id: clinicId,
      telegram_bot_token: parsed.data.token,
      telegram_bot_username: username,
      telegram_webhook_secret: webhookSecret,
      telegram_link_secret: linkSecret,
      created_by: user.id,
    },
    { onConflict: "clinic_id" }
  );
  if (error) return fail(error.message);

  revalidatePath("/settings/notifications");
  return ok(undefined);
}

/** Removes the clinic's bot config (sends then fall back to the platform env bot, if any). */
export async function clearTelegramBotConfig(): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_settings")
    .update({
      telegram_bot_token: null,
      telegram_bot_username: null,
      telegram_webhook_secret: null,
      telegram_link_secret: null,
    })
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/settings/notifications");
  return ok(undefined);
}

/**
 * Registers the Telegram webhook for this clinic's bot, with the secret token
 * Telegram echoes back on each call. Run after saving the bot.
 */
export async function setTelegramWebhook(): Promise<ActionResult<{ url: string }>> {
  const { clinicId } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const supabase = await createClient();
  const cfg = await getTelegramConfig(supabase, clinicId);

  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!cfg.botToken) return fail("No Telegram bot configured. Add your bot token first.");
  if (!cfg.webhookSecret) return fail("Missing webhook secret. Re-save the bot to generate it.");
  if (!base) return fail("NEXT_PUBLIC_APP_URL is not set.");

  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret_token: cfg.webhookSecret, allowed_updates: ["message"] }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) return fail(data.description ?? "Telegram rejected the webhook.");
    return ok({ url });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to reach Telegram.");
  }
}
