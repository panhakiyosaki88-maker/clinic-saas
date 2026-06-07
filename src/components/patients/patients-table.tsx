"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PatientPurgeButton } from "@/components/patients/patient-purge-button";

export interface PatientRow {
  id: string;
  patient_number: string;
  full_name: string;
  gender: string | null;
  age: number | null;
  blood_type: string | null;
  phone: string | null;
  created_at: string;
  last_visit_date: string | null;
  visit_count: number;
}

type SortKey = keyof Pick<
  PatientRow,
  "patient_number" | "full_name" | "gender" | "age" | "blood_type" | "phone" | "created_at" | "last_visit_date" | "visit_count"
>;
type Kind = "text" | "number" | "date";

const COLUMNS: { key: SortKey; labelKey: string; kind: Kind }[] = [
  { key: "patient_number", labelKey: "number", kind: "text" },
  { key: "full_name", labelKey: "name", kind: "text" },
  { key: "gender", labelKey: "gender", kind: "text" },
  { key: "age", labelKey: "age", kind: "number" },
  { key: "blood_type", labelKey: "blood", kind: "text" },
  { key: "phone", labelKey: "phone", kind: "text" },
  { key: "created_at", labelKey: "registered", kind: "date" },
  { key: "last_visit_date", labelKey: "lastVisit", kind: "date" },
  { key: "visit_count", labelKey: "visits", kind: "number" },
];

const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale) : "—";

function compare(a: PatientRow, b: PatientRow, key: SortKey, kind: Kind, dir: 1 | -1): number {
  const av = a[key];
  const bv = b[key];
  // Nulls always sort to the bottom regardless of direction.
  const aNull = av === null || av === undefined || av === "";
  const bNull = bv === null || bv === undefined || bv === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let res: number;
  if (kind === "number") res = (av as number) - (bv as number);
  else if (kind === "date") res = new Date(av as string).getTime() - new Date(bv as string).getTime();
  else res = String(av).localeCompare(String(bv));
  return res * dir;
}

export function PatientsTable({
  rows,
  canWrite,
}: {
  rows: PatientRow[];
  canWrite: boolean;
}) {
  const t = useTranslations("patients");
  const locale = useLocale();
  const [filter, setFilter] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const view = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = rows.filter((r) =>
        [r.patient_number, r.full_name, r.gender, r.blood_type, r.phone]
          .some((v) => v?.toLowerCase().includes(q))
      );
    }
    if (sort) {
      const col = COLUMNS.find((c) => c.key === sort.key)!;
      out = [...out].sort((a, b) => compare(a, b, sort.key, col.kind, sort.dir));
    }
    return out;
  }, [rows, filter, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 1 ? -1 : 1 }
        : { key, dir: 1 }
    );
  }

  return (
    <div>
      <div className="border-b border-[var(--border)] p-3">
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("table.filterPlaceholder")}
          className="h-9"
        />
      </div>

      {view.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">{t("table.noMatch")}</p>
      ) : (
        <Table>
          <THead>
            <tr>
              {COLUMNS.map((c) => {
                const active = sort?.key === c.key;
                const Icon = !active ? ChevronsUpDown : sort!.dir === 1 ? ChevronUp : ChevronDown;
                return (
                  <TH key={c.key}>
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-slate-900 dark:hover:text-slate-100 ${active ? "text-slate-900 dark:text-slate-100" : ""}`}
                    >
                      {t(`table.${c.labelKey}`)}
                      <Icon className={`h-3.5 w-3.5 ${active ? "" : "opacity-40"}`} />
                    </button>
                  </TH>
                );
              })}
              {canWrite && <TH className="text-right">{t("table.actions")}</TH>}
            </tr>
          </THead>
          <TBody>
            {view.map((p) => (
              <TR key={p.id}>
                <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.patient_number}</TD>
                <TD>
                  <Link href={`/patients/${p.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                    {p.full_name}
                  </Link>
                </TD>
                <TD className="text-slate-500 dark:text-slate-400">
                  {p.gender ? (t.has(`gender.${p.gender}`) ? t(`gender.${p.gender}`) : p.gender) : "—"}
                </TD>
                <TD className="text-slate-500 dark:text-slate-400">{p.age !== null ? p.age : "—"}</TD>
                <TD className="text-slate-500 dark:text-slate-400">
                  {p.blood_type && p.blood_type !== "unknown" ? p.blood_type : "—"}
                </TD>
                <TD className="text-slate-500 dark:text-slate-400">{p.phone ?? "—"}</TD>
                <TD className="text-slate-500 dark:text-slate-400">{fmtDate(p.created_at, locale)}</TD>
                <TD className="text-slate-500 dark:text-slate-400">{fmtDate(p.last_visit_date, locale)}</TD>
                <TD className="text-slate-500 dark:text-slate-400">{p.visit_count}</TD>
                {canWrite && (
                  <TD className="text-right">
                    <PatientPurgeButton patientId={p.id} patientName={p.full_name} />
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
