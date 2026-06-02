import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface ActivityItem {
  id: number;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  created_at: string;
}

/** Recent audit-log entries for the clinic (RLS scopes to the caller's clinic). */
export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ActivityItem[];
}

const ENTITY_LABEL: Record<string, string> = {
  patients: "Patient",
  appointments: "Appointment",
  medical_records: "Visit",
  vital_signs: "Vitals",
  prescriptions: "Prescription",
  prescription_items: "Prescription item",
  invoices: "Invoice",
  payments: "Payment",
  lab_requests: "Lab request",
  lab_results: "Lab result",
  medicines: "Medicine",
  inventory_transactions: "Stock movement",
  doctors: "Doctor",
  memberships: "Staff member",
  notifications: "Notification",
  clinics: "Clinic",
  branches: "Branch",
};

/** Human-friendly description, e.g. "Patient created". */
export function describeActivity(a: ActivityItem): string {
  const entity = ENTITY_LABEL[a.table_name] ?? a.table_name;
  const verb = a.action === "INSERT" ? "created" : a.action === "UPDATE" ? "updated" : "removed";
  return `${entity} ${verb}`;
}
