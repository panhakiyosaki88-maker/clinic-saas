import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CountRow {
  [key: string]: string | number;
  label: string;
  count: number;
}

export interface ProcedureReport {
  volume: number;
  revenue: number;
  byType: CountRow[];
  byDoctor: CountRow[];
}

const round = (n: number) => Number(n.toFixed(2));

function rollup(map: Map<string, number>): CountRow[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((r) => r.count !== 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Procedure activity within a date range: total volume, revenue (procedure-
 * category invoice lines on invoices issued in range), and breakdowns by
 * procedure type and ordering doctor. Kept entirely separate from imaging.
 */
export async function getProcedureReport(fromISO: string, toISO: string): Promise<ProcedureReport> {
  const supabase = await createClient();

  const [orderRes, revRes] = await Promise.all([
    supabase
      .from("procedure_orders")
      .select("procedure_name, doctors ( full_name )")
      .gte("ordered_at", fromISO)
      .lt("ordered_at", toISO)
      .neq("status", "cancelled")
      .is("deleted_at", null),
    supabase
      .from("invoice_items")
      .select("line_total, invoices!inner ( issued_at, status )")
      .eq("category", "procedure")
      .gte("invoices.issued_at", fromISO)
      .lt("invoices.issued_at", toISO)
      .neq("invoices.status", "cancelled"),
  ]);

  const rows = (orderRes.data ?? []) as unknown as { procedure_name: string; doctors: { full_name: string } | null }[];
  const byType = new Map<string, number>();
  const byDoctor = new Map<string, number>();
  for (const r of rows) {
    byType.set(r.procedure_name, (byType.get(r.procedure_name) ?? 0) + 1);
    const doc = r.doctors?.full_name ?? "—";
    byDoctor.set(doc, (byDoctor.get(doc) ?? 0) + 1);
  }

  const revenue = ((revRes.data ?? []) as { line_total: number }[]).reduce((s, r) => s + Number(r.line_total), 0);

  return {
    volume: rows.length,
    revenue: round(revenue),
    byType: rollup(byType),
    byDoctor: rollup(byDoctor),
  };
}
