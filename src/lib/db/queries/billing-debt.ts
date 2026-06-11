import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { InvoiceStatus } from "@/types/database";

export interface AgingBuckets {
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  total: number;
}

export interface PatientDebt {
  patientId: string | null;
  patient: string;
  patientKhmer: string | null;
  balance: number;
  oldestDays: number;
  invoiceCount: number;
  overdue: boolean;
}

export interface DebtReport {
  buckets: AgingBuckets;
  byPatient: PatientDebt[];
  totalOutstanding: number;
  overduePatients: number;
}

type Row = {
  patient_id: string | null;
  balance: number;
  status: InvoiceStatus;
  issued_at: string;
  due_date: string | null;
  patients: { full_name: string; khmer_name: string | null } | null;
};

const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / 86_400_000);

/**
 * Accounts-receivable aging: outstanding balances bucketed by age (days since
 * the due date, or issue date when no due date), plus a per-patient summary.
 */
export async function getDebtReport(scope?: BranchScope): Promise<DebtReport> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("invoices")
      .select("patient_id, balance, status, issued_at, due_date, patients ( full_name, khmer_name )")
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .gt("balance", 0),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

  const rows = (data ?? []) as unknown as Row[];
  const now = new Date();
  const buckets: AgingBuckets = { d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
  const byKey = new Map<string, PatientDebt>();
  let totalOutstanding = 0;

  for (const r of rows) {
    const bal = Number(r.balance);
    if (bal <= 0) continue;
    totalOutstanding += bal;

    const ref = new Date(r.due_date ?? r.issued_at);
    const age = Math.max(0, daysBetween(ref, now));
    if (age <= 30) buckets.d0_30 += bal;
    else if (age <= 60) buckets.d31_60 += bal;
    else if (age <= 90) buckets.d61_90 += bal;
    else buckets.d90plus += bal;
    buckets.total += bal;

    const isOverdue = !!r.due_date && new Date(r.due_date) < now;
    const key = r.patient_id ?? "—";
    const cur = byKey.get(key) ?? {
      patientId: r.patient_id,
      patient: r.patients?.full_name ?? "Walk-in / no patient",
      patientKhmer: r.patients?.khmer_name ?? null,
      balance: 0,
      oldestDays: 0,
      invoiceCount: 0,
      overdue: false,
    };
    cur.balance += bal;
    cur.invoiceCount += 1;
    cur.oldestDays = Math.max(cur.oldestDays, age);
    cur.overdue = cur.overdue || isOverdue;
    byKey.set(key, cur);
  }

  const byPatient = [...byKey.values()].sort((a, b) => b.balance - a.balance);
  const round = (n: number) => Number(n.toFixed(2));
  return {
    buckets: {
      d0_30: round(buckets.d0_30),
      d31_60: round(buckets.d31_60),
      d61_90: round(buckets.d61_90),
      d90plus: round(buckets.d90plus),
      total: round(buckets.total),
    },
    byPatient: byPatient.map((p) => ({ ...p, balance: round(p.balance) })),
    totalOutstanding: round(totalOutstanding),
    overduePatients: byPatient.filter((p) => p.overdue).length,
  };
}
