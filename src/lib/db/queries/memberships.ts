import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MembershipPlan = Database["public"]["Tables"]["membership_plans"]["Row"];
export type PatientMembership = Database["public"]["Tables"]["patient_memberships"]["Row"];

export async function listMembershipPlans(): Promise<MembershipPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Active plans for pickers (e.g. enrolling a patient). */
export async function listMembershipPlanOptions(): Promise<{ id: string; name: string; price: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .select("id, name, price")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, price: Number(p.price) }));
}

export interface PatientMembershipWithPlan extends PatientMembership {
  plan_name: string | null;
}

export async function listPatientMemberships(patientId: string): Promise<PatientMembershipWithPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_memberships")
    .select("*, membership_plans ( name )")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (PatientMembership & { membership_plans: { name: string } | null })[]).map((r) => ({
    ...r,
    plan_name: r.membership_plans?.name ?? null,
  }));
}
