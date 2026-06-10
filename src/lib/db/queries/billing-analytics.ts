import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/invoice";
import type { InvoiceStatus, PaymentKind, PaymentMethod } from "@/types/database";

export interface Series {
  label: string;
  value: number;
}

export interface BillingKpis {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  outstanding: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  collectionRate: number; // 0..1
  arpp: number; // average revenue per patient
}

export interface RecentPayment {
  id: string;
  patient: string;
  patientKhmer: string | null;
  method: string;
  kind: PaymentKind;
  amount: number;
  paid_at: string;
}

export interface OutstandingRow {
  id: string;
  invoice_number: string;
  patient: string;
  patientKhmer: string | null;
  balance: number;
  due_date: string | null;
  status: InvoiceStatus;
}

export interface BillingDashboard {
  kpis: BillingKpis;
  revenueTrend: Series[]; // net collections, last 30 days
  dailyCollections: Series[]; // last 14 days
  monthlyCollections: Series[]; // last 12 months
  methodBreakdown: { method: string; amount: number }[];
  recentPayments: RecentPayment[];
  outstandingInvoices: OutstandingRow[];
  revenueByService: Series[];
  topPatients: { patient: string; patientKhmer: string | null; amount: number }[];
}

type PaymentJoined = {
  id: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  paid_at: string;
  invoices: { patient_id: string | null; patients: { full_name: string; khmer_name: string | null } | null } | null;
};

type InvoiceRow = {
  id: string;
  status: InvoiceStatus;
  total: number;
  amount_paid: number;
  balance: number;
  service_type: string | null;
  source: string;
  patient_id: string | null;
  due_date: string | null;
  invoice_number: string;
  patients: { full_name: string; khmer_name: string | null } | null;
};

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const signed = (p: { kind: PaymentKind; amount: number }) =>
  p.kind === "refund" ? -Number(p.amount) : Number(p.amount);

export async function getBillingDashboard(): Promise<BillingDashboard> {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendStart = new Date(todayStart); trendStart.setDate(trendStart.getDate() - 29);
  const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [{ data: payData }, { data: invData }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, kind, paid_at, invoices ( patient_id, patients ( full_name, khmer_name ) )")
      .gte("paid_at", yearStart.toISOString())
      .order("paid_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, status, total, amount_paid, balance, service_type, source, patient_id, due_date, invoice_number, patients ( full_name, khmer_name )")
      .is("deleted_at", null),
  ]);

  const payments = (payData ?? []) as unknown as PaymentJoined[];
  const invoices = (invData ?? []) as unknown as InvoiceRow[];

  // ---- KPIs (revenue = net collections) ------------------------------------
  let revenueToday = 0, revenueWeek = 0, revenueMonth = 0;
  for (const p of payments) {
    const amt = signed(p);
    const t = new Date(p.paid_at);
    if (t >= todayStart) revenueToday += amt;
    if (t >= weekStart) revenueWeek += amt;
    if (t >= monthStart) revenueMonth += amt;
  }

  let outstanding = 0, paidCount = 0, unpaidCount = 0, partialCount = 0;
  let invoicedTotal = 0, collectedTotal = 0;
  const patientsWithInvoice = new Set<string>();
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    if (inv.patient_id) patientsWithInvoice.add(inv.patient_id);
    invoicedTotal += Number(inv.total);
    collectedTotal += Number(inv.amount_paid);
    if (Number(inv.balance) > 0.001) outstanding += Number(inv.balance);
    if (inv.status === "paid") paidCount += 1;
    else if (inv.status === "partially_paid") partialCount += 1;
    else if (inv.status === "unpaid" || inv.status === "pending" || inv.status === "overdue") unpaidCount += 1;
  }
  const collectionRate = invoicedTotal > 0 ? collectedTotal / invoicedTotal : 0;
  const arpp = patientsWithInvoice.size > 0 ? collectedTotal / patientsWithInvoice.size : 0;

  // ---- Time series ---------------------------------------------------------
  const daily = new Map<string, number>();
  const monthly = new Map<string, number>();
  const methodMap = new Map<string, number>();
  const patientPay = new Map<string, { name: string; khmer: string | null; amount: number }>();
  for (const p of payments) {
    const amt = signed(p);
    daily.set(dayKey(p.paid_at), (daily.get(dayKey(p.paid_at)) ?? 0) + amt);
    const mk = p.paid_at.slice(0, 7);
    monthly.set(mk, (monthly.get(mk) ?? 0) + amt);
    methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + amt);
    const pid = p.invoices?.patient_id;
    if (pid) {
      const cur = patientPay.get(pid) ?? { name: p.invoices?.patients?.full_name ?? "—", khmer: p.invoices?.patients?.khmer_name ?? null, amount: 0 };
      cur.amount += amt;
      patientPay.set(pid, cur);
    }
  }

  const revenueTrend: Series[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(trendStart); d.setDate(trendStart.getDate() + i);
    const k = dayKey(d);
    revenueTrend.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, value: Number((daily.get(k) ?? 0).toFixed(2)) });
  }
  const dailyCollections = revenueTrend.slice(-14);

  const monthlyCollections: Series[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyCollections.push({
      label: d.toLocaleString(undefined, { month: "short" }),
      value: Number((monthly.get(k) ?? 0).toFixed(2)),
    });
  }

  const methodBreakdown = [...methodMap.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([method, amount]) => ({
      method: PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method,
      amount: Number(amount.toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount);

  // ---- Widgets -------------------------------------------------------------
  const recentPayments: RecentPayment[] = payments.slice(0, 10).map((p) => ({
    id: p.id,
    patient: p.invoices?.patients?.full_name ?? "—",
    patientKhmer: p.invoices?.patients?.khmer_name ?? null,
    method: PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method,
    kind: p.kind,
    amount: Number(p.amount),
    paid_at: p.paid_at,
  }));

  const outstandingInvoices: OutstandingRow[] = invoices
    .filter((i) => i.status !== "cancelled" && Number(i.balance) > 0.001)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      patient: i.patients?.full_name ?? "—",
      patientKhmer: i.patients?.khmer_name ?? null,
      balance: Number(i.balance),
      due_date: i.due_date,
      status: i.status,
    }));

  const serviceMap = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    const key = inv.service_type || inv.source || "manual";
    serviceMap.set(key, (serviceMap.get(key) ?? 0) + Number(inv.total));
  }
  const revenueByService: Series[] = [...serviceMap.entries()]
    .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const topPatients = [...patientPay.values()]
    .map((p) => ({ patient: p.name, patientKhmer: p.khmer, amount: Number(p.amount.toFixed(2)) }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    kpis: {
      revenueToday: Number(revenueToday.toFixed(2)),
      revenueWeek: Number(revenueWeek.toFixed(2)),
      revenueMonth: Number(revenueMonth.toFixed(2)),
      outstanding: Number(outstanding.toFixed(2)),
      paidCount,
      unpaidCount,
      partialCount,
      collectionRate,
      arpp: Number(arpp.toFixed(2)),
    },
    revenueTrend,
    dailyCollections,
    monthlyCollections,
    methodBreakdown,
    recentPayments,
    outstandingInvoices,
    revenueByService,
    topPatients,
  };
}
