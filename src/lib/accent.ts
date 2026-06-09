/**
 * Shared accent ("UI tone") helpers used by both the server (root layout, to
 * render the accent on <html> on first paint — no flash) and the client accent
 * picker. Persisted in a cookie so the server can read it, mirrored in
 * localStorage for the picker's own state.
 */

export const ACCENT_COOKIE = "ui-accent";
export const ACCENT_CUSTOM_COOKIE = "ui-accent-custom";

/** Preset tones. `blue` is the default and carries no data-accent attribute. */
export const ACCENT_PRESETS = ["blue", "violet", "emerald", "teal", "amber", "rose"] as const;
export type AccentPreset = (typeof ACCENT_PRESETS)[number];

/**
 * Per-shade lightness + chroma factor used to derive a full --brand-* scale
 * from a single picked color via CSS relative-color syntax (mirrors Tailwind's
 * blue ramp).
 */
export const ACCENT_SHADES: [string, number, number][] = [
  ["50", 0.97, 0.18],
  ["100", 0.93, 0.35],
  ["300", 0.81, 0.7],
  ["400", 0.71, 0.9],
  ["500", 0.62, 1],
  ["600", 0.55, 1.05],
  ["700", 0.49, 1],
];

/** CSS custom-property map deriving a full --brand-* scale from one hex color. */
export function customBrandVars(hex: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, l, cf] of ACCENT_SHADES) {
    vars[`--brand-${k}`] = `oklch(from ${hex} ${l} calc(c * ${cf}) h)`;
  }
  return vars;
}

/**
 * Resolve the attributes to put on <html> for a persisted accent. Returns the
 * `data-accent` attribute and (for a custom color) the inline `--brand-*` style.
 */
export function accentHtmlProps(
  accent: string | undefined,
  customHex: string | undefined
): { "data-accent"?: string; style?: Record<string, string> } {
  if (accent === "custom" && customHex) {
    return { "data-accent": "custom", style: customBrandVars(customHex) };
  }
  if (accent && accent !== "blue") {
    return { "data-accent": accent };
  }
  return {};
}
