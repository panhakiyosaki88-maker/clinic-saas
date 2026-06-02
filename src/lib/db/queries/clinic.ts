import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];

/**
 * The caller's clinic. RLS guarantees this can only ever be the user's own
 * clinic, so no explicit clinic_id filter is needed.
 */
export async function getCurrentClinic(): Promise<Clinic | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBranches(): Promise<Branch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
