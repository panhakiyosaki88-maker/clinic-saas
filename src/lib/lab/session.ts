/**
 * Shared helpers for grouping a patient's lab work into per-date "sessions".
 *
 * Both the lab patient history page (server) and the patient-profile lab card
 * (client) group by the same stable, timezone-independent key — the ISO
 * calendar date the test was requested — so their date groups, and the in-page
 * anchors that link between them, always line up.
 */

/** Grouping key for a request's date, e.g. "2026-06-04". */
export function labSessionKey(requestedAt: string): string {
  return requestedAt.slice(0, 10);
}

/** DOM id / URL hash anchor for a session date, e.g. "lab-2026-06-04". */
export function labSessionAnchor(key: string): string {
  return `lab-${key}`;
}

/**
 * Human-readable date for a session key. Parsed at local midnight so the
 * calendar date never shifts across timezones (only the locale format may).
 */
export function formatLabSessionDate(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString();
}
