import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Procedure = Database["public"]["Tables"]["procedures"]["Row"];

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
