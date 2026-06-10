-- ============================================================================
-- Migration 0051 — Staff Telegram contact
-- ----------------------------------------------------------------------------
-- Lets staff accounts (clinic owner, doctors, any user) receive Telegram
-- notifications, mirroring patients.telegram_chat_id from 0050. The chat id is
-- captured by the self-service linking flow (/api/telegram/webhook) — a user
-- taps their personal deep link, the bot reports their chat id, and it's saved
-- here. Purely additive.
-- ============================================================================

alter table public.profiles
  add column if not exists telegram_chat_id text;
