import "server-only";
import { createClient } from "@/lib/supabase/server";
import { applyBranchFilter, type BranchScope } from "@/lib/branch/filter";
import { sanitizeSearch } from "@/lib/validations/patient";
import type { Database } from "@/types/database";

export type Medicine = Database["public"]["Tables"]["medicines"]["Row"];
export type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];

export async function listMedicines(search?: string, scope?: BranchScope): Promise<Medicine[]> {
  const supabase = await createClient();
  let query = applyBranchFilter(
    supabase.from("medicines").select("*").is("deleted_at", null),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );
  const s = sanitizeSearch(search);
  if (s) query = query.or(`name.ilike.%${s}%,generic_name.ilike.%${s}%,sku.ilike.%${s}%`);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface MedicineSuggestion {
  name: string;
  /** Catalog strength (e.g. "500mg"), used to prefill dosage. Null for history-only. */
  strength: string | null;
  /** Whether the name comes from the pharmacy catalog or only past prescriptions. */
  inCatalog: boolean;
}

/** Medicine name suggestions for the prescription form: the pharmacy catalog
 *  plus names previously prescribed, deduped (catalog entries win and keep
 *  their strength). */
export async function listMedicineSuggestions(scope?: BranchScope): Promise<MedicineSuggestion[]> {
  const supabase = await createClient();
  const [catalog, history, dismissed] = await Promise.all([
    applyBranchFilter(
      supabase
        .from("medicines")
        .select("name, strength")
        .is("deleted_at", null)
        .eq("is_active", true),
      scope?.activeId ?? null,
      scope?.primaryId ?? null
    ).order("name", { ascending: true }),
    supabase
      .from("prescription_items")
      .select("medicine_name")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("dismissed_medicine_names").select("name"),
  ]);
  if (catalog.error) throw catalog.error;
  if (history.error) throw history.error;
  if (dismissed.error) throw dismissed.error;

  const dismissedKeys = new Set((dismissed.data ?? []).map((d) => d.name.trim().toLowerCase()));

  const byKey = new Map<string, MedicineSuggestion>();
  for (const m of catalog.data ?? []) {
    const name = m.name.trim();
    const key = name.toLowerCase();
    if (key) byKey.set(key, { name, strength: m.strength, inCatalog: true });
  }
  for (const it of history.data ?? []) {
    const name = (it.medicine_name ?? "").trim();
    const key = name.toLowerCase();
    // Skip history-only names the clinic has dismissed from the typeahead.
    if (key && !byKey.has(key) && !dismissedKeys.has(key)) {
      byKey.set(key, { name, strength: null, inCatalog: false });
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface MedicineDispenseOption {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  /** Quantity prescribed in this visit, when the picker is prescription-scoped. */
  prescribed_quantity?: number;
}

/** Active medicines for dispensing pickers: id, name, price and stock. */
export async function listMedicineOptions(scope?: BranchScope): Promise<MedicineDispenseOption[]> {
  const supabase = await createClient();
  const { data, error } = await applyBranchFilter(
    supabase
      .from("medicines")
      .select("id, name, selling_price, stock_quantity")
      .is("deleted_at", null)
      .eq("is_active", true),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  ).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    selling_price: Number(m.selling_price ?? 0),
    stock_quantity: m.stock_quantity,
  }));
}

/**
 * Dispensing options scoped to a visit's prescriptions: only medicines that were
 * prescribed in this visit AND exist in the pharmacy catalog. Each carries the
 * prescribed quantity so the dispense form can pre-fill qty + price. Prescribed
 * medicines absent from the catalog are omitted (can't be dispensed). Returns an
 * empty array when the visit has no prescription, so callers can fall back to the
 * full catalog.
 */
export async function listPrescribedDispenseOptions(
  visitId: string,
  scope?: BranchScope
): Promise<MedicineDispenseOption[]> {
  const supabase = await createClient();

  const { data: rx, error: rxErr } = await supabase
    .from("prescriptions")
    .select("prescription_items ( medicine_name, quantity )")
    .eq("visit_id", visitId)
    .is("deleted_at", null);
  if (rxErr) throw rxErr;

  // Sum prescribed quantity per medicine name (case-insensitive).
  const prescribed = new Map<string, { name: string; quantity: number }>();
  for (const p of (rx ?? []) as unknown as {
    prescription_items: { medicine_name: string | null; quantity: number | null }[] | null;
  }[]) {
    for (const it of p.prescription_items ?? []) {
      const name = (it.medicine_name ?? "").trim();
      const key = name.toLowerCase();
      if (!key) continue;
      const prev = prescribed.get(key);
      prescribed.set(key, {
        name,
        quantity: (prev?.quantity ?? 0) + (Number(it.quantity) || 0),
      });
    }
  }
  if (prescribed.size === 0) return [];

  const { data: meds, error: medErr } = await applyBranchFilter(
    supabase
      .from("medicines")
      .select("id, name, selling_price, stock_quantity")
      .is("deleted_at", null)
      .eq("is_active", true),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  );
  if (medErr) throw medErr;

  const options: MedicineDispenseOption[] = [];
  for (const m of meds ?? []) {
    const match = prescribed.get(m.name.trim().toLowerCase());
    if (!match) continue; // prescribed-only: skip catalog medicines not on the Rx
    options.push({
      id: m.id,
      name: m.name,
      selling_price: Number(m.selling_price ?? 0),
      stock_quantity: m.stock_quantity,
      prescribed_quantity: match.quantity > 0 ? match.quantity : undefined,
    });
  }
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMedicine(id: string): Promise<Medicine | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listTransactions(medicineId: string): Promise<InventoryTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("medicine_id", medicineId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Active medicines at or below their reorder level. */
export async function lowStockMedicines(scope?: BranchScope): Promise<Medicine[]> {
  const all = await listMedicines(undefined, scope);
  return all.filter((m) => m.is_active && m.stock_quantity <= m.reorder_level);
}

export interface ExpiringBatch {
  id: string;
  medicine_id: string;
  medicine_name: string;
  batch_number: string | null;
  expiry_date: string;
}

/** Purchase batches expiring within `days` (default 60), soonest first. */
export async function expiringSoon(days = 60, scope?: BranchScope): Promise<ExpiringBatch[]> {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffYmd = cutoff.toISOString().slice(0, 10);

  const { data, error } = await applyBranchFilter(
    supabase
      .from("inventory_transactions")
      .select("id, medicine_id, batch_number, expiry_date, medicines ( name )")
      .eq("reason", "purchase")
      .not("expiry_date", "is", null)
      .lte("expiry_date", cutoffYmd),
    scope?.activeId ?? null,
    scope?.primaryId ?? null
  ).order("expiry_date", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    medicine_id: string;
    batch_number: string | null;
    expiry_date: string;
    medicines: { name: string } | null;
  }[]).map((r) => ({
    id: r.id,
    medicine_id: r.medicine_id,
    medicine_name: r.medicines?.name ?? "—",
    batch_number: r.batch_number,
    expiry_date: r.expiry_date,
  }));
}
