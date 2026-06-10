import "server-only";
import crypto from "crypto";

/**
 * Deep-link tokens for self-service Telegram linking.
 *
 * A token encodes which account a Telegram chat should attach to — a patient or
 * a user (clinic owner / doctor / staff) — and is signed with TELEGRAM_LINK_SECRET
 * so the webhook can trust it without storing anything. Telegram's `start`
 * payload allows only [A-Za-z0-9_-] and max 64 chars, so the token is:
 *
 *   <kindChar><uuid-without-dashes(32)><sig(20)>   → 53 chars
 *
 * kindChar: 'p' (patient) | 'u' (user); sig: truncated base64url HMAC-SHA256.
 */
export type LinkKind = "patient" | "user";

const KIND_CHAR: Record<LinkKind, string> = { patient: "p", user: "u" };
const CHAR_KIND: Record<string, LinkKind> = { p: "patient", u: "user" };
const SIG_LEN = 20;

function secret(): string {
  return process.env.TELEGRAM_LINK_SECRET || "";
}

function sign(kind: LinkKind, id: string): string {
  return crypto.createHmac("sha256", secret()).update(`${kind}.${id}`).digest("base64url").slice(0, SIG_LEN);
}

/** Build a signed link token for an account. Returns "" if the secret is unset. */
export function signLinkToken(kind: LinkKind, id: string): string {
  if (!secret()) return "";
  return `${KIND_CHAR[kind]}${id.replace(/-/g, "")}${sign(kind, id)}`;
}

/** Verify a token from a `/start <token>` payload. Returns null if invalid. */
export function verifyLinkToken(token: string): { kind: LinkKind; id: string } | null {
  if (!secret() || !token || token.length !== 1 + 32 + SIG_LEN) return null;
  const kind = CHAR_KIND[token[0]];
  if (!kind) return null;
  const hex = token.slice(1, 33);
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) return null;
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const provided = token.slice(33);
  const expected = sign(kind, id);
  try {
    if (provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  return { kind, id };
}

/** The bot's @username (without @), from env. Needed to build deep links. */
export function botUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

/**
 * Full deep link a person taps to connect, e.g. https://t.me/MyBot?start=<token>.
 * Returns null if the bot username or link secret isn't configured.
 */
export function telegramDeepLink(kind: LinkKind, id: string): string | null {
  const user = botUsername();
  const token = signLinkToken(kind, id);
  if (!user || !token) return null;
  return `https://t.me/${user}?start=${token}`;
}
