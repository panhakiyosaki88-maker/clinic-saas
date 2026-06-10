import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DB = SupabaseClient<Database>;

export interface TelegramConfig {
  botToken: string | null;
  botUsername: string | null;
  webhookSecret: string | null;
  linkSecret: string | null;
  /** Where the config came from — a clinic's saved bot, the platform env, or nothing. */
  source: "db" | "env" | "none";
}

export function isTelegramConfigured(c: TelegramConfig): boolean {
  return !!c.botToken && !!c.botUsername && !!c.linkSecret;
}

/**
 * Effective Telegram config for a clinic: the clinic's own saved bot if present,
 * otherwise the platform-wide TELEGRAM_* env vars (back-compat), otherwise none.
 */
export async function getTelegramConfig(supabase: DB, clinicId: string): Promise<TelegramConfig> {
  const { data } = await supabase
    .from("notification_settings")
    .select("telegram_bot_token, telegram_bot_username, telegram_webhook_secret, telegram_link_secret")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (data?.telegram_bot_token) {
    return {
      botToken: data.telegram_bot_token,
      botUsername: data.telegram_bot_username,
      webhookSecret: data.telegram_webhook_secret,
      linkSecret: data.telegram_link_secret,
      source: "db",
    };
  }

  const envToken = process.env.TELEGRAM_BOT_TOKEN || null;
  if (envToken) {
    return {
      botToken: envToken,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || null,
      linkSecret: process.env.TELEGRAM_LINK_SECRET || null,
      source: "env",
    };
  }

  return { botToken: null, botUsername: null, webhookSecret: null, linkSecret: null, source: "none" };
}

/** Just the bot token a clinic should send with (DB bot or env fallback). */
export async function getTelegramToken(supabase: DB, clinicId: string): Promise<string | null> {
  return (await getTelegramConfig(supabase, clinicId)).botToken;
}
