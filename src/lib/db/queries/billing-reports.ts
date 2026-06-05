import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS, SERVICE_CATEGORY_LABELS } from "@/lib/validations/invoice";
import type { PaymentKind, PaymentMethod, ServiceCategory } from "@/types/database";

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
  byCategory: BreakdownRow[];
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
    invoice_items: { category: ServiceCategory; line_total: number }[] | null;
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
    .select("amount, kind, method, invoices ( service_type, source, doctors ( full_name ), branches ( name ), invoice_items ( category, line_total ) )")
    .gte("paid_at", fromISO)
    .lt("paid_at", toISO);

  const rows = (data ?? []) as unknown as Row[];
  const doctor = new Map<string, number>();
  const branch = new Map<string, number>();
  const service = new Map<string, number>();
  const method = new Map<string, number>();
  const category = new Map<string, number>();
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

    // Allocate the collected amount across the invoice's line categories,
    // proportional to each category's share of the invoice subtotal.
    const items = inv?.invoice_items ?? [];
    const sub = items.reduce((s, it) => s + Number(it.line_total), 0);
    if (sub > 0) {
      const byCat = new Map<ServiceCategory, number>();
      for (const it of items) byCat.set(it.category, (byCat.get(it.category) ?? 0) + Number(it.line_total));
      for (const [cat, lineSum] of byCat) {
        const label = SERVICE_CATEGORY_LABELS[cat as keyof typeof SERVICE_CATEGORY_LABELS] ?? cat;
        category.set(label, (category.get(label) ?? 0) + amt * (lineSum / sub));
      }
    } else {
      category.set("Other Services", (category.get("Other Services") ?? 0) + amt);
    }
  }

  return {
    total: round(total),
    byDoctor: rollup(doctor),
    byBranch: rollup(branch),
    byService: rollup(service),
    byMethod: rollup(method),
    byCategory: rollup(category),
  };
}
