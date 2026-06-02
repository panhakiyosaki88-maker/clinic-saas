import { describe, it, expect } from "vitest";
import { toCsv, toExcelHtml, type ReportColumn } from "@/lib/reports/export";

const cols: ReportColumn[] = [
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
];

describe("toCsv", () => {
  it("emits a header row even with no data", () => {
    expect(toCsv(cols, [])).toBe("Date,Amount");
  });
  it("serializes rows", () => {
    expect(toCsv(cols, [{ date: "2026-06-01", amount: 120 }])).toBe("Date,Amount\n2026-06-01,120");
  });
  it("quotes and escapes values containing commas or quotes", () => {
    const csv = toCsv([{ key: "name", label: "Name" }], [{ name: 'Doe, "Jane"' }]);
    expect(csv).toBe('Name\n"Doe, ""Jane"""');
  });
  it("renders null/undefined as empty cells", () => {
    expect(toCsv(cols, [{ date: null, amount: undefined }])).toBe("Date,Amount\n,");
  });
});

describe("toExcelHtml", () => {
  it("produces an HTML table with headers and rows", () => {
    const html = toExcelHtml("Revenue", cols, [{ date: "2026-06-01", amount: 50 }]);
    expect(html).toContain("<th>Date</th>");
    expect(html).toContain("<td>2026-06-01</td>");
    expect(html).toContain("urn:schemas-microsoft-com:office:excel");
  });
  it("escapes HTML in cells", () => {
    const html = toExcelHtml("X", [{ key: "n", label: "N" }], [{ n: "<script>" }]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
