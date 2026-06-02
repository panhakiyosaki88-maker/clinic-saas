/** Shared report column/row shapes + CSV / Excel serializers (pure, testable). */

export interface ReportColumn {
  key: string;
  label: string;
}
export type ReportRow = Record<string, string | number | null | undefined>;

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  // Quote if the value contains a comma, quote, or newline.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** RFC-4180-ish CSV. Opens cleanly in Excel/Sheets. */
export function toCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsv(r[c.key])).join(",")).join("\n");
  return body ? `${header}\n${body}` : header;
}

function escapeHtml(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * A minimal HTML table that Excel opens natively when saved as `.xls`. Avoids a
 * heavy spreadsheet dependency while still giving users a real "Excel" file.
 */
export function toExcelHtml(title: string, columns: ReportColumn[], rows: ReportRow[]): string {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}
