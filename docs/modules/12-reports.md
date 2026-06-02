# Module 12 — Reports

Cross-module reporting with date ranges and CSV / Excel / PDF export. Read-only —
no new tables; it aggregates existing data and is RLS-safe per section.

## What this module delivers
- **Aggregation queries** (`src/lib/db/queries/reports.ts`): revenue (total, by day, by method),
  new patients, appointments by status, doctor activity (visits), inventory snapshot (stock value
  + low-stock count), and outstanding invoices.
- **Export** (`src/lib/reports/export.ts`): pure `toCsv` + `toExcelHtml` serializers and a
  `ReportExport` client component that downloads `.csv` / `.xls`. **PDF** is the page's print view.
- **UI** (`/reports`): a date-range filter, summary cards, and one card per report with its own
  export buttons. The page is gated by `reports.view`; **each section is additionally gated by the
  underlying module's read permission** (RLS makes this safe regardless).

## Export approach
| Format | How | Why |
|---|---|---|
| CSV | RFC-4180 serializer → Blob download | universal, opens in Excel/Sheets |
| Excel | HTML-table `.xls` (Office namespaces) | real Excel file with **no spreadsheet dependency** |
| PDF | browser print of the report page | reuses the shared `PrintButton` print pattern |

## Permission model
`reports.view` opens the page; a section renders only if the viewer can read its source
(`billing.read` → revenue/outstanding, `appointments.read` → appointments, `emr.read` → doctor
activity, `pharmacy.read` → inventory). So an accountant sees financials, a nurse sees clinical
activity, an owner sees everything — and RLS enforces it at the database, not just the UI.

## Verifying locally
1. `supabase db reset`; create some payments, appointments, visits and stock.
2. Open **Reports**, set a date range → summary cards + tables populate.
3. Export any table as **CSV**/**Excel**; **PDF** prints the whole report.
4. Sign in as a role missing a permission → that section is hidden; without `reports.view` the page
   is blocked.

## Follow-ups
- Charts (revenue trend, appointment mix) on top of the existing aggregates.
- Server-streamed exports for very large ranges; scheduled email reports (Notifications module).
