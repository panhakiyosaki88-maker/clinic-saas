/**
 * Normalizes a person's name to uppercase for storage and display.
 *
 * Only cased (Latin / English) letters are affected — Khmer and other caseless
 * scripts have no uppercase form, so `"john សុខ"` becomes `"JOHN សុខ"`. This
 * keeps patient and doctor names consistently capitalized regardless of how
 * they were typed, while leaving non-English names untouched.
 */
export function toUpperName(name: string): string {
  return name.toUpperCase();
}
