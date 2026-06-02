import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SubscriptionUsage {
  patients: number;
  branches: number;
  doctors: number;
}

/** Current resource usage for the caller's clinic (RLS-scoped). */
export async function getSubscriptionUsage(): Promise<SubscriptionUsage> {
  const supabase = await createClient();
  const [patients, branches, doctors] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("branches").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("doctors").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);
  return {
    patients: patients.count ?? 0,
    branches: branches.count ?? 0,
    doctors: doctors.count ?? 0,
  };
}
