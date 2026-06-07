/**
 * Locale catalog for the UI. English is the default; Khmer (km) is the
 * second supported language. Per the project's medical-language rules, ONLY
 * interface text is localized — medicine names, lab tests, diagnoses, codes and
 * other clinical data always render in English regardless of locale.
 */
export const locales = ["en", "km"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Human-readable names for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  km: "ខ្មែរ (Khmer)",
};

/** Compact labels for the top-bar toggle. */
export const localeShort: Record<Locale, string> = {
  en: "EN",
  km: "ខ្មែរ",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
