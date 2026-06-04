import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type BillingSettings = Database["public"]["Tables"]["billing_settings"]["Row"];

export async function getBillingSettings(): Promise<BillingSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("billing_settings").select("*").maybeSingle();
  if (error) throw error;
  return data;
}
