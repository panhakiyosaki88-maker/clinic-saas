"use client";

import { toCsv, toExcelHtml, type ReportColumn, type ReportRow } from "@/lib/reports/export";
import { Button } from "@/components/ui/button";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV + Excel download buttons for one report table. PDF is via page print. */
export function ReportExport({
  name,
  columns,
  rows,
}: {
  name: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}) {
  return (
    <div className="flex gap-1 print:hidden">
      <Button
        size="sm"
        variant="outline"
        disabled={rows.length === 0}
        onClick={() => download(`${name}.csv`, toCsv(columns, rows), "text/csv;charset=utf-8")}
      >
        CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={rows.length === 0}
        onClick={() =>
          download(`${name}.xls`, toExcelHtml(name, columns, rows), "application/vnd.ms-excel")
        }
      >
        Excel
      </Button>
    </div>
  );
}
