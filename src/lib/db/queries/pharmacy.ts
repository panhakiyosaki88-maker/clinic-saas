import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/validations/patient";
import type { Database } from "@/types/database";

export type Medicine = Database["public"]["Tables"]["medicines"]["Row"];
export type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];

export async function listMedicines(search?: string): Promise<Medicine[]> {
  const supabase = await createClient();
  let query = supabase.from("medicines").select("*").is("deleted_at", null);
  const s = sanitizeSearch(search);
  if (s) query = query.or(`name.ilike.%${s}%,generic_name.ilike.%${s}%,sku.ilike.%${s}%`);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
export async function lowStockMedicines(): Promise<Medicine[]> {
  const all = await listMedicines();
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
export async function expiringSoon(days = 60): Promise<ExpiringBatch[]> {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffYmd = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id, medicine_id, batch_number, expiry_date, medicines ( name )")
    .eq("reason", "purchase")
    .not("expiry_date", "is", null)
    .lte("expiry_date", cutoffYmd)
    .order("expiry_date", { ascending: true });
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
