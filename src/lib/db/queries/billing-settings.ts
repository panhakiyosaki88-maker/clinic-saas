import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import type { Database } from "@/types/database";

export type BillingSettings = Database["public"]["Tables"]["billing_settings"]["Row"];

/**
 * Billing settings are per-branch. Resolves which branch to read:
 *   - `undefined` (no arg)  → the active branch, else the primary branch.
 *   - `null`                → the primary branch (e.g. an invoice with no branch).
 *   - a branch id           → that branch.
 * Returns null when the branch has no row yet (callers fall back to defaults).
 */
export async function getBillingSettings(
  branchId?: string | null
): Promise<BillingSettings | null> {
  let target = branchId;
  if (target === undefined) {
    const { activeId, primaryId } = await getActiveBranchContext();
    target = activeId ?? primaryId;
  } else if (target === null) {
    const { primaryId } = await getActiveBranchContext();
    target = primaryId;
  }
  if (!target) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_settings")
    .select("*")
    .eq("branch_id", target)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Every branch's billing settings for the clinic (for the settings page). */
export async function listBillingSettings(): Promise<BillingSettings[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("billing_settings").select("*");
  if (error) throw error;
  return data ?? [];
}
