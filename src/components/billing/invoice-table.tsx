"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { voidInvoices } from "@/server/actions/billing";
import { formatIn, type CurrencyCode } from "@/lib/billing/currency";
import { INVOICE_STATUSES } from "@/lib/validations/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface InvoiceTableRow {
  id: string;
  invoice_number: string;
  patient: string;
  status: string;
  total: number;
  balance: number;
  issued_at: string;
}

const STATUS_TONE: Record<string, string> = {
  draft: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  unpaid: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  partially_paid: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  overdue: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  refunded: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};
const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const col = createColumnHelper<InvoiceTableRow>();

export function InvoiceTable({
  rows,
  canWrite,
  currency = "USD",
  rate = 4100,
}: {
  rows: InvoiceTableRow[];
  canWrite: boolean;
  currency?: CurrencyCode;
  rate?: number;
}) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const money = React.useCallback((n: number) => formatIn(n, currency, rate), [currency, rate]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "issued_at", desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [pending, startTransition] = React.useTransition();

  const columns = React.useMemo(
    () => [
      ...(canWrite
        ? [
            col.display({
              id: "select",
              header: ({ table }) => (
                <input
                  type="checkbox"
                  checked={table.getIsAllPageRowsSelected()}
                  onChange={table.getToggleAllPageRowsSelectedHandler()}
                />
              ),
              cell: ({ row }) => (
                <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
              ),
              enableSorting: false,
            }),
          ]
        : []),
      col.accessor("invoice_number", {
        header: t("table.invoice"),
        cell: (c) => (
          <Link href={`/billing/${c.row.original.id}`} className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">
            {c.getValue()}
          </Link>
        ),
      }),
      col.accessor("patient", { header: t("table.patient"), cell: (c) => c.getValue() || "—" }),
      col.accessor("issued_at", {
        header: t("table.issued"),
        cell: (c) => new Date(c.getValue()).toLocaleDateString(locale),
      }),
      col.accessor("total", { header: t("table.total"), cell: (c) => <span className="tabular-nums">{money(c.getValue())}</span> }),
      col.accessor("balance", { header: t("table.balance"), cell: (c) => <span className="tabular-nums">{money(c.getValue())}</span> }),
      col.accessor("status", {
        header: t("table.status"),
        cell: (c) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.getValue()] ?? ""}`}>
            {t.has(`status.${c.getValue()}`) ? t(`status.${c.getValue()}`) : c.getValue()}
          </span>
        ),
        filterFn: "equals",
      }),
    ],
    [canWrite, money, t, locale]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? "";
  const selectedIds = Object.keys(rowSelection);

  function onBulkVoid() {
    startTransition(async () => {
      const res = await voidInvoices(selectedIds);
      if (res.ok) {
        setRowSelection({});
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={t("table.search")}
          className="h-9 max-w-xs"
        />
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => table.getColumn("status")?.setFilterValue(e.target.value || undefined)}
        >
          <option value="">{t("table.allStatuses")}</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
        {canWrite && selectedIds.length > 0 && (
          <Button variant="destructive" size="sm" disabled={pending} onClick={onBulkVoid}>
            {pending ? t("table.voiding") : t("table.void", { count: selectedIds.length })}
          </Button>
        )}
        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {t("table.countOf", { shown: table.getFilteredRowModel().rows.length, total: rows.length })}
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sortable = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  const Icon = !sorted ? ChevronsUpDown : sorted === "asc" ? ChevronUp : ChevronDown;
                  return (
                    <th key={h.id} className="px-3 py-2.5 font-medium">
                      {h.isPlaceholder ? null : sortable ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <Icon className={`h-3.5 w-3.5 ${sorted ? "" : "opacity-40"}`} />
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-6 text-center text-sm text-slate-400">{t("table.noMatch")}</td></tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">
          {t("table.pageOf", { page: table.getState().pagination.pageIndex + 1, pages: table.getPageCount() || 1 })}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>{t("table.previous")}</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>{t("table.next")}</Button>
        </div>
      </div>
    </div>
  );
}
