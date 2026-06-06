import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { Database } from "@/types/database";

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

export interface InvoiceWithPatient extends Invoice {
  patient_name: string | null;
  patient_number: string | null;
}

const LIST_SELECT = `*, patients ( full_name, patient_number )`;

type ListJoined = Invoice & { patients: { full_name: string; patient_number: string } | null };

function mapList(rows: ListJoined[]): InvoiceWithPatient[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? null,
    patient_number: r.patients?.patient_number ?? null,
  }));
}

export async function listInvoices(
  limit = 50,
  scope?: BranchScope
): Promise<InvoiceWithPatient[]> {
  const supabase = await createClient();
  const query = applyBranchFilter(
    supabase
      .from("invoices")
      .select(LIST_SELECT)
      .is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  )
    .order("issued_at", { ascending: false })
    .limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return mapList((data ?? []) as unknown as ListJoined[]);
}

export async function listPatientInvoices(patientId: string): Promise<InvoiceWithPatient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(LIST_SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return mapList((data ?? []) as unknown as ListJoined[]);
}

/** The visit's open draft invoice (source = visit), if one exists. The Billing
 *  Workspace continues this draft instead of creating a duplicate. */
export async function getVisitDraftInvoice(
  visitId: string
): Promise<{ id: string; discount: number; tax: number; notes: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, discount, tax, notes")
    .eq("visit_id", visitId)
    .eq("source", "visit")
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, discount: Number(data.discount), tax: Number(data.tax), notes: data.notes };
}

/** Outstanding (unpaid / partially paid) invoices for dashboards & reports. */
export async function outstandingInvoices(): Promise<InvoiceWithPatient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(LIST_SELECT)
    .is("deleted_at", null)
    .in("status", ["unpaid", "partially_paid"])
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return mapList((data ?? []) as unknown as ListJoined[]);
}

export interface PaymentRow {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number: string;
  patient_name: string | null;
  amount: number;
  method: Payment["method"];
  kind: Payment["kind"];
  reference: string | null;
  paid_at: string;
}

/** Clinic-wide payments + refunds ledger, newest first. */
export async function listPayments(limit = 100): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, receipt_number, invoice_id, amount, method, kind, reference, paid_at, invoices ( invoice_number, patients ( full_name ) )")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as unknown as (Payment & {
    invoices: { invoice_number: string; patients: { full_name: string } | null } | null;
  })[];
  return rows.map((r) => ({
    id: r.id,
    receipt_number: r.receipt_number,
    invoice_id: r.invoice_id,
    invoice_number: r.invoices?.invoice_number ?? "—",
    patient_name: r.invoices?.patients?.full_name ?? null,
    amount: Number(r.amount),
    method: r.method,
    kind: r.kind,
    reference: r.reference,
    paid_at: r.paid_at,
  }));
}

export interface InvoiceDetail extends InvoiceWithPatient {
  items: InvoiceItem[];
  payments: Payment[];
  clinic_name: string;
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(`*, patients ( full_name, patient_number ), clinics ( name ), invoice_items ( * ), payments ( * )`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Invoice & {
    patients: { full_name: string; patient_number: string } | null;
    clinics: { name: string } | null;
    invoice_items: InvoiceItem[] | null;
    payments: Payment[] | null;
  };
  const items = (row.invoice_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const payments = (row.payments ?? []).slice().sort((a, b) => +new Date(b.paid_at) - +new Date(a.paid_at));

  return {
    ...row,
    patient_name: row.patients?.full_name ?? null,
    patient_number: row.patients?.patient_number ?? null,
    clinic_name: row.clinics?.name ?? "",
    items,
    payments,
  };
}
