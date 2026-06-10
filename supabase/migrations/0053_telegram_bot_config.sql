-- ============================================================================
-- Migration 0053 — Per-clinic Telegram bot configuration
-- ----------------------------------------------------------------------------
-- Lets each clinic owner configure their own Telegram bot from Settings, instead
-- of platform-wide environment variables. The bot token + username are entered
-- by the owner; the webhook/link secrets are generated server-side when the bot
-- is saved. Code falls back to the TELEGRAM_* env vars when these are null, so
-- existing env-based setups keep working. Purely additive.
-- ============================================================================

alter table public.notification_settings
  add column if not exists telegram_bot_token      text,
  add column if not exists telegram_bot_username   text,
  add column if not exists telegram_webhook_secret text,
  add column if not exists telegram_link_secret    text;

-- Look up the owning clinic from the secret Telegram echoes back on each webhook.
create index if not exists notification_settings_tg_webhook_idx
  on public.notification_settings (telegram_webhook_secret)
  where (telegram_webhook_secret is not null);
