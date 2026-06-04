/**
 * Intelligent SKU generation for pharmacy medicines.
 *
 * SKU format: [PREFIX][STRENGTH]-[SEQUENCE], e.g.
 *   Paracetamol 500mg  → PARA500-0001
 *   Amoxicillin 500mg  → AMOX500-0001
 *   Vitamin D 1000IU   → VITD1000-0001
 *
 * The base (PREFIX + STRENGTH) is pure and shared by the form (live preview)
 * and the server (sequence assignment). The sequence is assigned server-side.
 */

/** Matches a strength like "500mg", "1000 IU", "5 ml", "0.5g". */
const STRENGTH_RE = /(\d+(?:\.\d+)?)\s*(mcg|mg|iu|ml|g)\b/i;

/**
 * Uppercase A–Z/0–9 prefix from a medicine name. Strength tokens are stripped
 * first so they never leak into the prefix. Single word → first 4 letters;
 * multi-word → first 3 of the first word plus the initial of each later word,
 * capped at 5 (e.g. "Vitamin D" → "VITD").
 */
export function medicinePrefix(name: string): string {
  const words = name
    .replace(STRENGTH_RE, " ")
    .toUpperCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return "MED";
  if (words.length === 1) return words[0].slice(0, 4);
  let prefix = words[0].slice(0, 3);
  for (let i = 1; i < words.length && prefix.length < 5; i++) {
    prefix += words[i][0];
  }
  return prefix.slice(0, 5);
}

/**
 * Numeric strength token for the SKU (the unit is dropped): "500mg" → "500",
 * "1000 IU" → "1000". Reads the explicit strength first, then falls back to
 * parsing it out of the name. Returns "" when no strength is present.
 */
export function strengthToken(strength: string | undefined | null, name: string): string {
  const source = strength && strength.trim() ? strength : name;
  const match = source.match(STRENGTH_RE);
  if (!match) return "";
  return match[1].replace(/\./g, "");
}

/** The SKU base (everything before the sequence): PREFIX + STRENGTH. */
export function skuBase(name: string, strength?: string | null): string {
  return `${medicinePrefix(name)}${strengthToken(strength, name)}`;
}

/** Formats a sequence number as a 4-digit, zero-padded suffix. */
export function skuSequence(n: number): string {
  return String(n).padStart(4, "0");
}
