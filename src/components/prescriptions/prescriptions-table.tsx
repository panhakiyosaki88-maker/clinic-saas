"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";

export interface PrescriptionRow {
  id: string;
  patient_number: string;
  patient_name: string;
  doctor_name: string | null;
  doctor_avatar_path: string | null;
  prescribed_at: string;
  item_count: number;
}

type SortKey = keyof Pick<
  PrescriptionRow,
  "patient_number" | "patient_name" | "doctor_name" | "prescribed_at" | "item_count"
>;
type Kind = "text" | "number" | "date";

const COLUMNS: { key: SortKey; label: string; kind: Kind }[] = [
  { key: "patient_number", label: "Number", kind: "text" },
  { key: "patient_name", label: "Patient", kind: "text" },
  { key: "doctor_name", label: "Doctor", kind: "text" },
  { key: "prescribed_at", label: "Prescribed", kind: "date" },
  { key: "item_count", label: "Items", kind: "number" },
];

const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString() : "—");

function compare(a: PrescriptionRow, b: PrescriptionRow, key: SortKey, kind: Kind, dir: 1 | -1): number {
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

export function PrescriptionsTable({ rows }: { rows: PrescriptionRow[] }) {
  const [filter, setFilter] = React.useState("");
  const [doctor, setDoctor] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 } | null>({
    key: "prescribed_at",
    dir: -1,
  });

  const doctors = React.useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) if (r.doctor_name) names.add(r.doctor_name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const view = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter((r) =>
        [r.patient_number, r.patient_name, r.doctor_name].some((v) => v?.toLowerCase().includes(q))
      );
    }
    if (doctor) {
      out = out.filter((r) => r.doctor_name === doctor);
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
          placeholder="Filter by number, patient, or doctor…"
          className="h-9 max-w-xs"
        />
        <select className={selectClass} value={doctor} onChange={(e) => setDoctor(e.target.value)}>
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {view.length} of {rows.length}
        </span>
      </div>

      {view.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">No prescriptions match your filter.</p>
      ) : (
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
                      {c.label}
                      <Icon className={`h-3.5 w-3.5 ${active ? "" : "opacity-40"}`} />
                    </button>
                  </TH>
                );
              })}
            </tr>
          </THead>
          <TBody>
            {view.map((p) => (
              <TR key={p.id}>
                <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.patient_number}</TD>
                <TD>
                  <Link
                    href={`/prescriptions/${p.id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {p.patient_name}
                  </Link>
                </TD>
                <TD className="text-slate-500 dark:text-slate-400">
                  {p.doctor_name ? (
                    <span className="inline-flex items-center gap-1.5">
                      <DoctorAvatar name={p.doctor_name} avatarPath={p.doctor_avatar_path} size={32} />
                      {p.doctor_name}
                    </span>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-slate-500 dark:text-slate-400">{fmtDate(p.prescribed_at)}</TD>
                <TD className="text-right text-slate-500 dark:text-slate-400">{p.item_count}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
