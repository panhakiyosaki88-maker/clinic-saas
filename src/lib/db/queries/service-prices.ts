import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ServicePrice = Database["public"]["Tables"]["service_prices"]["Row"];

export interface ServicePriceRow extends ServicePrice {
  branch_name: string | null;
}

/** Service catalog for the clinic. Archived rows are excluded by default. */
export async function listServicePrices(includeArchived = false): Promise<ServicePriceRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("service_prices")
    .select("*, branches ( name )")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (!includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as (ServicePrice & { branches: { name: string } | null })[]).map((r) => ({
    ...r,
    branch_name: r.branches?.name ?? null,
  }));
}

export async function getServicePrice(id: string): Promise<ServicePrice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("service_prices").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
