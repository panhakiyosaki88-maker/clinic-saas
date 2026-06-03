import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];

/**
 * The caller's clinic, resolved from their JWT clinic_id claim. We filter
 * explicitly rather than relying on RLS to return a single row: a super admin
 * can see every clinic, so an unfiltered maybeSingle() would error with >1 row.
 */
export async function getCurrentClinic(): Promise<Clinic | null> {
  const { clinic_id } = getClinicClaims(await getCurrentUser());
  if (!clinic_id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", clinic_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const { clinic_id } = getClinicClaims(await getCurrentUser());
  if (!clinic_id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("clinic_id", clinic_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBranches(): Promise<Branch[]> {
  // Scope to the caller's clinic explicitly: RLS lets a super admin read EVERY
  // clinic's branches, so relying on the policy alone would list other clinics'
  // locations too (mirrors getCurrentClinic above).
  const { clinic_id } = getClinicClaims(await getCurrentUser());
  if (!clinic_id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("clinic_id", clinic_id)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBranch(id: string): Promise<Branch | null> {
  const { clinic_id } = getClinicClaims(await getCurrentUser());
  if (!clinic_id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", clinic_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}
