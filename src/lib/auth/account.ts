import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus } from "@/types/database";

/**
 * Reads the current user's approval status from their profile. A new sign-up
 * is `pending` until a Super Admin approves it (Module: account approval); the
 * onboarding page and dashboard layout use this to gate access. Returns null
 * when there is no authenticated user or no profile row.
 *
 * Uses the RLS-scoped server client — `profiles_select_own` lets a user read
 * their own row, so no admin client is needed here.
 */
export async function getAccountStatus(): Promise<AccountStatus | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  return data?.status ?? null;
}
