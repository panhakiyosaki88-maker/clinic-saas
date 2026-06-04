import "server-only";
import { createClient } from "@/lib/supabase/server";

const BILLING_TABLES = [
  "invoices",
  "invoice_items",
  "payments",
  "service_prices",
  "billing_settings",
  "invoice_source_links",
] as const;

export const BILLING_TABLE_LABELS: Record<string, string> = {
  invoices: "Invoice",
  invoice_items: "Invoice item",
  payments: "Payment",
  service_prices: "Price",
  billing_settings: "Settings",
  invoice_source_links: "Auto-bill link",
};

export interface BillingAuditRow {
  id: number;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string | null;
  created_at: string;
}

/** Recent billing-related audit-trail entries (clinic-scoped via RLS). */
export async function listBillingAudit(limit = 150): Promise<BillingAuditRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, created_at")
    .in("table_name", BILLING_TABLES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BillingAuditRow[];
}
