"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/date";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";
import { PatientName } from "@/components/patients/patient-name";

export interface PrescriptionRow {
  patientId: string;
  patient_number: string;
  patient_name: string;
  patient_khmer_name: string | null;
  rx_count: number;
  item_count: number;
  last_prescribed_at: string;
  doctors: string[];
}

type SortKey = keyof Pick<
  PrescriptionRow,
  "patient_name" | "rx_count" | "item_count" | "last_prescribed_at"
>;
type Kind = "text" | "number" | "date";

const COLUMNS: { key: SortKey; labelKey: string; kind: Kind }[] = [
  { key: "patient_name", labelKey: "patient", kind: "text" },
  { key: "rx_count", labelKey: "prescriptions", kind: "number" },
  { key: "item_count", labelKey: "items", kind: "number" },
  { key: "last_prescribed_at", labelKey: "last", kind: "date" },
];

const fmtDate = (d: string | null | undefined) => formatDate(d) || "—";

function compare(a: PrescriptionRow, b: PrescriptionRow, key: SortKey, kind: Kind, dir: 1 | -1): number {
  const av = a[key];
  const bv = b[key];
  let res: number;
  if (kind === "number") res = (av as number) - (bv as number);
  else if (kind === "date") res = new Date(av as string).getTime() - new Date(bv as string).getTime();
  else res = String(av).localeCompare(String(bv));
  return res * dir;
}

export function PrescriptionsTable({ rows }: { rows: PrescriptionRow[] }) {
  const t = useTranslations("prescriptions.table");
  const [filter, setFilter] = React.useState("");
  const [doctor, setDoctor] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 } | null>({
    key: "last_prescribed_at",
    dir: -1,
  });

  const doctors = React.useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) for (const d of r.doctors) names.add(d);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const view = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter((r) =>
        [r.patient_number, r.patient_name, ...r.doctors].some((v) => v?.toLowerCase().includes(q))
      );
    }
    if (doctor) {
      out = out.filter((r) => r.doctors.includes(doctor));
    }
    if (sort) {
      const col = COLUMNS.find((c) => c.key === sort.key)!;
      out = [...out].sort((a, b) => compare(a, b, sort.key, col.kind, sort.dir));
    }
    return out;
  }, [rows, filter, doctor, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  const selectClass =
    "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="h-9 max-w-xs"
        />
        <select className={selectClass} value={doctor} onChange={(e) => setDoctor(e.target.value)}>
          <option value="">{t("allDoctors")}</option>
          {doctors.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {t("countOf", { shown: view.length, total: rows.length })}
        </span>
      </div>

      {view.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">{t("noMatch")}</p>
      ) : (
        <ResponsiveTable
          cards={view.map((p) => (
            <DataCard
              key={p.patientId}
              title={
                <PatientName khmerName={p.patient_khmer_name} khmerClassName="text-xs font-normal text-slate-400">
                  <Link href={`/prescriptions/patient/${p.patientId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                    {p.patient_name}
                    {p.patient_number && <span className="ml-2 text-xs font-normal text-slate-400">{p.patient_number}</span>}
                  </Link>
                </PatientName>
              }
            >
              <DataCardRow label={t("prescriptions")} value={p.rx_count} />
              <DataCardRow label={t("items")} value={p.item_count} />
              <DataCardRow label={t("last")} value={fmtDate(p.last_prescribed_at)} />
            </DataCard>
          ))}
        >
          <Table>
            <THead>
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort?.key === c.key;
                  const Icon = !active ? ChevronsUpDown : sort!.dir === 1 ? ChevronUp : ChevronDown;
                  return (
                    <TH key={c.key} className={c.kind === "number" ? "text-right" : undefined}>
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-slate-900 dark:hover:text-slate-100 ${active ? "text-slate-900 dark:text-slate-100" : ""}`}
                      >
                        {t(c.labelKey)}
                        <Icon className={`h-3.5 w-3.5 ${active ? "" : "opacity-40"}`} />
                      </button>
                    </TH>
                  );
                })}
              </tr>
            </THead>
            <TBody>
              {view.map((p) => (
                <TR key={p.patientId}>
                  <TD>
                    <PatientName khmerName={p.patient_khmer_name}>
                      <Link
                        href={`/prescriptions/patient/${p.patientId}`}
                        className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {p.patient_name}
                      </Link>
                      {p.patient_number && <span className="ml-2 text-xs text-slate-400">{p.patient_number}</span>}
                    </PatientName>
                  </TD>
                  <TD className="text-right text-slate-500 dark:text-slate-400">{p.rx_count}</TD>
                  <TD className="text-right text-slate-500 dark:text-slate-400">{p.item_count}</TD>
                  <TD className="text-slate-500 dark:text-slate-400">{fmtDate(p.last_prescribed_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ResponsiveTable>
      )}
    </div>
  );
}
