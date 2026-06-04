import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/invoice";
import type { PaymentKind, PaymentMethod } from "@/types/database";

export interface BreakdownRow {
  [key: string]: string | number;
  label: string;
  amount: number;
}

export interface BillingBreakdowns {
  total: number;
  byDoctor: BreakdownRow[];
  byBranch: BreakdownRow[];
  byService: BreakdownRow[];
  byMethod: BreakdownRow[];
}

type Row = {
  amount: number;
  kind: PaymentKind;
  method: PaymentMethod;
  invoices: {
    service_type: string | null;
    source: string;
    doctors: { full_name: string } | null;
    branches: { name: string } | null;
  } | null;
};

const round = (n: number) => Number(n.toFixed(2));

function rollup(map: Map<string, number>): BreakdownRow[] {
  return [...map.entries()]
    .map(([label, amount]) => ({ label, amount: round(amount) }))
    .filter((r) => r.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Collected revenue (payments net of refunds) within a date range, broken down
 * by doctor, branch, service type and payment method. Powers the billing
 * reports page and its CSV/Excel/PDF exports.
 */
export async function getBillingBreakdowns(fromISO: string, toISO: string): Promise<BillingBreakdowns> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("amount, kind, method, invoices ( service_type, source, doctors ( full_name ), branches ( name ) )")
    .gte("paid_at", fromISO)
    .lt("paid_at", toISO);

  const rows = (data ?? []) as unknown as Row[];
  const doctor = new Map<string, number>();
  const branch = new Map<string, number>();
  const service = new Map<string, number>();
  const method = new Map<string, number>();
  let total = 0;

  for (const r of rows) {
    const amt = (r.kind === "refund" ? -1 : 1) * Number(r.amount);
    total += amt;
    const inv = r.invoices;
    doctor.set(inv?.doctors?.full_name ?? "Unassigned", (doctor.get(inv?.doctors?.full_name ?? "Unassigned") ?? 0) + amt);
    branch.set(inv?.branches?.name ?? "No branch", (branch.get(inv?.branches?.name ?? "No branch") ?? 0) + amt);
    const svc = inv?.service_type || inv?.source || "manual";
    service.set(svc, (service.get(svc) ?? 0) + amt);
    const m = PAYMENT_METHOD_LABELS[r.method as keyof typeof PAYMENT_METHOD_LABELS] ?? r.method;
    method.set(m, (method.get(m) ?? 0) + amt);
  }

  return {
    total: round(total),
    byDoctor: rollup(doctor),
    byBranch: rollup(branch),
    byService: rollup(service),
    byMethod: rollup(method),
  };
}
