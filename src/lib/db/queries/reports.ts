import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/invoice";

export interface RevenueReport {
  total: number;
  byDay: { date: string; amount: number }[];
  byMethod: { method: string; amount: number }[];
}

export async function getRevenueReport(fromISO: string, toISO: string): Promise<RevenueReport> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("amount, method, paid_at")
    .gte("paid_at", fromISO)
    .lt("paid_at", toISO);

  const rows = data ?? [];
  const byDayMap = new Map<string, number>();
  const byMethodMap = new Map<string, number>();
  let total = 0;
  for (const p of rows) {
    const amt = Number(p.amount);
    total += amt;
    const day = new Date(p.paid_at).toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + amt);
    byMethodMap.set(p.method, (byMethodMap.get(p.method) ?? 0) + amt);
  }
  return {
    total,
    byDay: [...byDayMap.entries()].sort().map(([date, amount]) => ({ date, amount })),
    byMethod: [...byMethodMap.entries()].map(([method, amount]) => ({
      method: PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method,
      amount,
    })),
  };
}

export async function getNewPatientsCount(fromISO: string, toISO: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("created_at", fromISO)
    .lt("created_at", toISO);
  return count ?? 0;
}

export async function getAppointmentsByStatus(
  fromISO: string,
  toISO: string
): Promise<{ status: string; count: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("status")
    .is("deleted_at", null)
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);

  const map = new Map<string, number>();
  for (const a of data ?? []) map.set(a.status, (map.get(a.status) ?? 0) + 1);
  return [...map.entries()].map(([status, count]) => ({ status: status.replace("_", " "), count }));
}

export async function getDoctorActivity(
  fromISO: string,
  toISO: string
): Promise<{ doctor: string; visits: number }[]> {
  const supabase = await createClient();
  const [{ data: doctors }, { data: visits }] = await Promise.all([
    supabase.from("doctors").select("full_name, user_id").is("deleted_at", null),
    supabase
      .from("medical_records")
      .select("provider_user_id")
      .is("deleted_at", null)
      .gte("visit_date", fromISO)
      .lt("visit_date", toISO),
  ]);

  const counts = new Map<string, number>();
  for (const v of visits ?? []) {
    if (v.provider_user_id) counts.set(v.provider_user_id, (counts.get(v.provider_user_id) ?? 0) + 1);
  }
  return (doctors ?? [])
    .map((d) => ({ doctor: d.full_name, visits: d.user_id ? counts.get(d.user_id) ?? 0 : 0 }))
    .sort((a, b) => b.visits - a.visits);
}

export interface InventoryReport {
  medicineCount: number;
  lowStockCount: number;
  stockValue: number;
}

export async function getInventoryReport(): Promise<InventoryReport> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicines")
    .select("stock_quantity, reorder_level, purchase_price, is_active")
    .is("deleted_at", null);

  let stockValue = 0;
  let lowStockCount = 0;
  const rows = data ?? [];
  for (const m of rows) {
    stockValue += m.stock_quantity * Number(m.purchase_price ?? 0);
    if (m.is_active && m.stock_quantity <= m.reorder_level) lowStockCount += 1;
  }
  return { medicineCount: rows.length, lowStockCount, stockValue };
}

export interface OutstandingReport {
  count: number;
  total: number;
  rows: { invoice_number: string; patient: string; balance: number }[];
}

export async function getOutstandingReport(): Promise<OutstandingReport> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number, balance, patients ( full_name )")
    .is("deleted_at", null)
    .in("status", ["unpaid", "partially_paid"])
    .order("balance", { ascending: false });

  const rows = ((data ?? []) as unknown as {
    invoice_number: string;
    balance: number;
    patients: { full_name: string } | null;
  }[]).map((r) => ({
    invoice_number: r.invoice_number,
    patient: r.patients?.full_name ?? "—",
    balance: Number(r.balance),
  }));

  return { count: rows.length, total: rows.reduce((s, r) => s + r.balance, 0), rows };
}
