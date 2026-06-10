/** A single owner-defined custom profile field ({label, value}). */
export interface ClinicCustomField {
  label: string;
  value: string;
}

/**
 * Safely coerce a clinic's `custom_fields` JSON column into label/value rows.
 * Rows without a non-empty label are dropped so they never reach the UI.
 */
export function parseClinicCustomFields(raw: unknown): ClinicCustomField[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (r && typeof r === "object" && "label" in r) {
      const { label, value } = r as { label?: unknown; value?: unknown };
      if (typeof label === "string" && label.trim()) {
        return [{ label, value: typeof value === "string" ? value : "" }];
      }
    }
    return [];
  });
}
