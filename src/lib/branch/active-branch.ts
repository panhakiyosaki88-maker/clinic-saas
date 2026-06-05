import "server-only";
import { cookies } from "next/headers";
import { listBranches, type Branch } from "@/lib/db/queries/clinic";

/** Cookie holding the user's active branch id, or the literal "all". */
export const ACTIVE_BRANCH_COOKIE = "active_branch";

/** Raw active branch id from the cookie; null means "All branches". */
export async function getActiveBranchId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_BRANCH_COOKIE)?.value;
  return value && value !== "all" ? value : null;
}

export interface ActiveBranchContext {
  /** The branch lists/forms should be scoped to; null = All branches. */
  activeId: string | null;
  /** The caller's clinic branches (already clinic-scoped). */
  branches: Branch[];
  /** The clinic's primary branch id, if any (blank branch_id maps here). */
  primaryId: string | null;
}

/**
 * Resolves the active branch against the clinic's actual branches. A cookie
 * pointing at a branch that no longer belongs to this clinic (deleted, or left
 * over from a different clinic) is treated as "All".
 */
export async function getActiveBranchContext(): Promise<ActiveBranchContext> {
  const branches = await listBranches();
  const cookieId = await getActiveBranchId();
  const activeId =
    cookieId && branches.some((b) => b.id === cookieId) ? cookieId : null;
  const primaryId = branches.find((b) => b.is_primary)?.id ?? null;
  return { activeId, branches, primaryId };
}
