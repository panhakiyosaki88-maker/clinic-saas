import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/invoice";

export interface RevenueReport {
  total: number;
  byDay: { date: string; amount: number }[];
  byMethod: { method: string; amount: number }[];
}

export async function getRevenueReport(fromISO: string, toISO: string, scope?: BranchScope): Promise<RevenueReport> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("payments")
      .select("amount, method, paid_at")
      .gte("paid_at", fromISO)
      .lt("paid_at", toISO),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

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

export interface PatientStats {
  total: number;
  newThisWeek: number;
  newThisMonth: number;
}

/** Patient counts for the dashboard stats widget. */
export async function getPatientStats(scope?: BranchScope): Promise<PatientStats> {
  const supabase = await createClient();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const base = () =>
    applyBranchFilter(
      supabase.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null),
      scope?.activeId ?? null,
      scope?.primaryId ?? null
    );
  const [total, week, month] = await Promise.all([
    base(),
    base().gte("created_at", weekStart.toISOString()),
    base().gte("created_at", monthStart.toISOString()),
  ]);
  return {
    total: total.count ?? 0,
    newThisWeek: week.count ?? 0,
    newThisMonth: month.count ?? 0,
  };
}

export interface DaySeries {
  label: string;
  date: string;
  value: number;
}

/** New patients per day for the last `days` days (oldest → newest). */
export async function getPatientGrowthDaily(days = 30, scope?: BranchScope): Promise<DaySeries[]> {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const { data } = await applyBranchFilter(
    supabase
      .from("patients")
      .select("created_at")
      .is("deleted_at", null)
      .gte("created_at", start.toISOString()),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

  const counts = new Map<string, number>();
  const buckets: DaySeries[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
    buckets.push({ label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), date: key, value: 0 });
  }
  for (const p of data ?? []) {
    const key = new Date(p.created_at).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((b) => ({ ...b, value: counts.get(b.date) ?? 0 }));
}

/** Collected revenue per calendar month for the last `months` months. */
export async function getMonthlyRevenue(months = 6, scope?: BranchScope): Promise<DaySeries[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const { data } = await applyBranchFilter(
    supabase.from("payments").select("amount, paid_at").gte("paid_at", start.toISOString()),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

  const sums = new Map<string, number>();
  const buckets: DaySeries[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    sums.set(key, 0);
    buckets.push({ label: d.toLocaleDateString(undefined, { month: "short" }), date: key, value: 0 });
  }
  for (const p of data ?? []) {
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (sums.has(key)) sums.set(key, (sums.get(key) ?? 0) + Number(p.amount));
  }
  return buckets.map((b) => ({ ...b, value: Math.round((sums.get(b.date) ?? 0) * 100) / 100 }));
}

export interface BillingTotals {
  invoicedTotal: number;
  collectedTotal: number;
  collectionRate: number; // 0..100
  avgRevenuePerPatient: number;
}

/** Lifetime collection metrics across all (non-deleted) invoices. */
export async function getBillingTotals(scope?: BranchScope): Promise<BillingTotals> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("invoices")
      .select("total, balance, patient_id")
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

  const rows = data ?? [];
  let invoicedTotal = 0;
  let collectedTotal = 0;
  const patients = new Set<string>();
  for (const r of rows) {
    const total = Number(r.total ?? 0);
    const balance = Number(r.balance ?? 0);
    invoicedTotal += total;
    collectedTotal += total - balance;
    if (r.patient_id) patients.add(r.patient_id);
  }
  return {
    invoicedTotal,
    collectedTotal,
    collectionRate: invoicedTotal > 0 ? Math.round((collectedTotal / invoicedTotal) * 100) : 0,
    avgRevenuePerPatient: patients.size > 0 ? collectedTotal / patients.size : 0,
  };
}

const RISK_RULES: { flag: string; tone: "rose" | "amber" | "violet"; test: RegExp }[] = [
  { flag: "Diabetes", tone: "amber", test: /diabet/i },
  { flag: "Hypertension", tone: "rose", test: /hypertens|high blood pressure|\bhbp\b/i },
  { flag: "Pregnancy", tone: "violet", test: /pregnan/i },
  { flag: "Severe allergy", tone: "rose", test: /penicillin|anaphyla|severe|nut|peanut/i },
];

export interface HighRiskPatient {
  id: string;
  name: string;
  flags: { flag: string; tone: "rose" | "amber" | "violet" }[];
}

/** Patients flagged high-risk from chronic conditions / allergies. */
export async function getHighRiskPatients(limit = 6, scope?: BranchScope): Promise<{ count: number; rows: HighRiskPatient[] }> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("patients")
      .select("id, full_name, chronic_diseases, allergies")
      .is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

  const flagged: HighRiskPatient[] = [];
  for (const p of data ?? []) {
    const haystack = `${p.chronic_diseases ?? ""} ${p.allergies ?? ""}`;
    const flags = RISK_RULES.filter((r) => r.test.test(haystack)).map((r) => ({ flag: r.flag, tone: r.tone }));
    if (flags.length > 0) flagged.push({ id: p.id, name: p.full_name, flags });
  }
  return { count: flagged.length, rows: flagged.slice(0, limit) };
}

export async function getNewPatientsCount(fromISO: string, toISO: string, scope?: BranchScope): Promise<number> {
  const supabase = await createClient();
  const { count } = await applyBranchFilter(
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );
  return count ?? 0;
}

export async function getAppointmentsByStatus(
  fromISO: string,
  toISO: string,
  scope?: BranchScope
): Promise<{ status: string; count: number }[]> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("appointments")
      .select("status")
      .is("deleted_at", null)
      .gte("scheduled_at", fromISO)
      .lt("scheduled_at", toISO),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );

  const map = new Map<string, number>();
  for (const a of data ?? []) map.set(a.status, (map.get(a.status) ?? 0) + 1);
  return [...map.entries()].map(([status, count]) => ({ status: status.replace("_", " "), count }));
}

export async function getDoctorActivity(
  fromISO: string,
  toISO: string,
  scope?: BranchScope
): Promise<{ doctor: string; visits: number }[]> {
  const supabase = await createClient();
  const activeId = scope?.activeId ?? null;
  const primaryId = scope?.primaryId ?? null;
  const [{ data: doctors }, { data: visits }] = await Promise.all([
    applyBranchFilter(
      supabase.from("doctors").select("full_name, user_id").is("deleted_at", null),
      activeId,
      primaryId
    ),
    applyBranchFilter(
      supabase
        .from("medical_records")
        .select("provider_user_id")
        .is("deleted_at", null)
        .gte("visit_date", fromISO)
        .lt("visit_date", toISO),
      activeId,
      primaryId
    ),
  ]);

  const counts = new Map<string, number>();
  for (const v of visits ?? []) {
    if (v.provider_user_id) counts.set(v.provider_user_id, (counts.get(v.provider_user_id) ?? 0) + 1);
  }
  return (doctors ?? [])
    .map((d) => ({ doctor: d.full_name, visits: d.user_id ? counts.get(d.user_id) ?? 0 : 0 }))
    .sort((a, b) => b.visits - a.visits);
}

export interface InventoryItem {
  // Index signature so items are usable directly as report export rows.
  [key: string]: string | number | null;
  sku: string;
  name: string;
  strength: string;
  category: string;
  stock: number;
  reorder_level: number;
  purchase_price: number | null;
  selling_price: number | null;
  stock_value: number;
  low: string;
}

export interface InventoryReport {
  medicineCount: number;
  lowStockCount: number;
  stockValue: number;
  items: InventoryItem[];
}

export async function getInventoryReport(scope?: BranchScope): Promise<InventoryReport> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("medicines")
      .select("name, sku, strength, category, stock_quantity, reorder_level, purchase_price, selling_price, is_active")
      .is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  ).order("name", { ascending: true });

  let stockValue = 0;
  let lowStockCount = 0;
  const rows = data ?? [];
  const items: InventoryItem[] = rows.map((m) => {
    const value = m.stock_quantity * Number(m.purchase_price ?? 0);
    const low = m.is_active && m.stock_quantity <= m.reorder_level;
    stockValue += value;
    if (low) lowStockCount += 1;
    return {
      sku: m.sku ?? "—",
      name: m.name,
      strength: m.strength ?? "",
      category: m.category ?? "",
      stock: m.stock_quantity,
      reorder_level: m.reorder_level,
      purchase_price: m.purchase_price,
      selling_price: m.selling_price,
      stock_value: Number(value.toFixed(2)),
      low: low ? "Low" : "",
    };
  });
  return { medicineCount: rows.length, lowStockCount, stockValue, items };
}

export interface OutstandingReport {
  count: number;
  total: number;
  rows: { invoice_number: string; patient: string; patientKhmer: string | null; balance: number }[];
}

export async function getOutstandingReport(scope?: BranchScope): Promise<OutstandingReport> {
  const supabase = await createClient();
  const { data } = await applyBranchFilter(
    supabase
      .from("invoices")
      .select("invoice_number, balance, patients ( full_name, khmer_name )")
      .is("deleted_at", null)
      .in("status", ["unpaid", "partially_paid"]),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  ).order("balance", { ascending: false });

  const rows = ((data ?? []) as unknown as {
    invoice_number: string;
    balance: number;
    patients: { full_name: string; khmer_name: string | null } | null;
  }[]).map((r) => ({
    invoice_number: r.invoice_number,
    patient: r.patients?.full_name ?? "—",
    patientKhmer: r.patients?.khmer_name ?? null,
    balance: Number(r.balance),
  }));

  return { count: rows.length, total: rows.reduce((s, r) => s + r.balance, 0), rows };
}
