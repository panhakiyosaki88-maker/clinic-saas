import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, applyInvoiceBranchFilter, type BranchScope } from "@/lib/branch/filter";

export interface CountRow {
  [key: string]: string | number;
  label: string;
  count: number;
}

export interface ImagingReport {
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
 * Imaging activity within a date range: total volume, revenue (imaging-category
 * invoice lines on invoices issued in range), and breakdowns by study type and
 * requesting doctor. Kept entirely separate from procedure reporting.
 */
export async function getImagingReport(fromISO: string, toISO: string, scope?: BranchScope): Promise<ImagingReport> {
  const supabase = await createClient();
  const activeId = scope?.activeId ?? null;
  const primaryId = scope?.primaryId ?? null;

  const [reqRes, revRes] = await Promise.all([
    applyBranchFilter(
      supabase
        .from("imaging_requests")
        .select("service_name, doctors ( full_name )")
        .gte("requested_at", fromISO)
        .lt("requested_at", toISO)
        .neq("status", "cancelled")
        .is("deleted_at", null),
      activeId,
      primaryId
    ),
    applyInvoiceBranchFilter(
      supabase
        .from("invoice_items")
        .select("line_total, invoices!inner ( issued_at, status, branch_id )")
        .eq("category", "imaging")
        .gte("invoices.issued_at", fromISO)
        .lt("invoices.issued_at", toISO)
        .neq("invoices.status", "cancelled"),
      activeId,
      primaryId
    ),
  ]);

  const rows = (reqRes.data ?? []) as unknown as { service_name: string; doctors: { full_name: string } | null }[];
  const byType = new Map<string, number>();
  const byDoctor = new Map<string, number>();
  for (const r of rows) {
    byType.set(r.service_name, (byType.get(r.service_name) ?? 0) + 1);
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
