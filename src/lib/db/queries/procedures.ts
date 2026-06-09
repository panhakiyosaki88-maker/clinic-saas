import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import type { Database } from "@/types/database";

export type Procedure = Database["public"]["Tables"]["procedures"]["Row"];
export type ProcedureCategory = Database["public"]["Tables"]["procedure_categories"]["Row"];
export type ProcedureOrder = Database["public"]["Tables"]["procedure_orders"]["Row"];
export type ProcedureRecord = Database["public"]["Tables"]["procedure_records"]["Row"];

export async function listProcedures(): Promise<Procedure[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedures")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Active procedures for pickers (e.g. recording a procedure on a visit). */
export async function listProcedureOptions(): Promise<{ id: string; name: string; default_price: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedures")
    .select("id, name, default_price")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, default_price: Number(p.default_price) }));
}

// -- Categories / catalog -----------------------------------------------------
export async function listProcedureCategories(): Promise<ProcedureCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("procedure_categories").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface ProcedureCategoryGroup {
  id: string;
  name: string;
  services: { id: string; name: string; default_price: number }[];
}

/** Active catalog grouped by category, for the order picker. */
export async function listProcedureCatalogTree(): Promise<ProcedureCategoryGroup[]> {
  const [cats, services] = await Promise.all([listProcedureCategories(), listProcedures()]);
  const groups = new Map<string, ProcedureCategoryGroup>();
  for (const c of cats) {
    if (c.parent_id) continue;
    groups.set(c.id, { id: c.id, name: c.name, services: [] });
  }
  const uncategorized: ProcedureCategoryGroup = { id: "", name: "Uncategorized", services: [] };
  for (const s of services) {
    if (!s.is_active) continue;
    const entry = { id: s.id, name: s.name, default_price: Number(s.default_price) };
    const g = s.category_id ? groups.get(s.category_id) : null;
    (g ?? uncategorized).services.push(entry);
  }
  const result = Array.from(groups.values()).filter((g) => g.services.length > 0);
  if (uncategorized.services.length > 0) result.push(uncategorized);
  return result;
}

// -- Orders -------------------------------------------------------------------
export interface ProcedureOrderWithNames extends ProcedureOrder {
  patient_name: string;
  patient_number: string;
  doctor_name: string | null;
  category_name: string | null;
}

const SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name ), procedure_categories ( name )`;

type Joined = ProcedureOrder & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string } | null;
  procedure_categories: { name: string } | null;
};

function map(rows: Joined[]): ProcedureOrderWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    category_name: r.procedure_categories?.name ?? null,
  }));
}

export async function listProcedureOrders(limit = 80, scope?: BranchScope): Promise<ProcedureOrderWithNames[]> {
  const supabase = await createClient();
  const query = applyBranchFilter(
    supabase.from("procedure_orders").select(SELECT).is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  )
    .order("ordered_at", { ascending: false })
    .limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

export async function listPatientProcedureOrders(patientId: string): Promise<ProcedureOrderWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedure_orders")
    .select(SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("ordered_at", { ascending: false });
  if (error) throw error;
  return map((data ?? []) as unknown as Joined[]);
}

/** The clinical record (notes / outcome) for an order, if any. */
export async function getProcedureRecord(orderId: string): Promise<ProcedureRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedure_records")
    .select("*")
    .eq("procedure_order_id", orderId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
