/**
 * Currency helpers. All monetary amounts in the system are stored in **USD**.
 * KHR is always a display conversion using the clinic's single exchange rate
 * (billing_settings.usd_to_khr_rate). The clinic's `currency` setting chooses
 * which currency is shown as the primary (large) one; the other is the
 * secondary equivalent.
 */

export const DEFAULT_USD_TO_KHR = 4100;

export type CurrencyCode = "USD" | "KHR";

export interface CurrencyContext {
  /** Which currency to show first/large. */
  primary: CurrencyCode;
  /** USD → KHR exchange rate. */
  rate: number;
}

/** Build a currency context from a billing_settings row (or its absence). */
export function currencyContext(settings: {
  currency?: string | null;
  usd_to_khr_rate?: number | null;
} | null): CurrencyContext {
  const primary = settings?.currency === "KHR" ? "KHR" : "USD";
  const rate = Number(settings?.usd_to_khr_rate) || DEFAULT_USD_TO_KHR;
  return { primary, rate };
}

/** Convert a USD amount to KHR, rounded to the nearest 100 riel. */
export function usdToKhr(usd: number, rate: number): number {
  return Math.round((Number(usd) || 0) * rate / 100) * 100;
}

/** "$5.50" — USD with two decimals and thousands separators. */
export function formatUSD(usd: number): string {
  return `$${(Number(usd) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "៛22,500" — KHR with no decimals, thousands separators, riel symbol. */
export function formatKHR(khr: number): string {
  return `៛${Math.round(Number(khr) || 0).toLocaleString("en-US")}`;
}

/** Format a stored USD amount in a single currency code. */
export function formatIn(usd: number, code: CurrencyCode, rate: number): string {
  return code === "KHR" ? formatKHR(usdToKhr(usd, rate)) : formatUSD(usd);
}

/** Primary + secondary strings for a stored USD amount (for dual display). */
export function formatMoney(usd: number, ctx: CurrencyContext): { primary: string; secondary: string } {
  const usdStr = formatUSD(usd);
  const khrStr = formatKHR(usdToKhr(usd, ctx.rate));
  return ctx.primary === "KHR"
    ? { primary: khrStr, secondary: usdStr }
    : { primary: usdStr, secondary: khrStr };
}

/** One-line dual string, e.g. "$5.50 · ៛22,500". */
export function formatMoneyDual(usd: number, ctx: CurrencyContext): string {
  const { primary, secondary } = formatMoney(usd, ctx);
  return `${primary} · ${secondary}`;
}
