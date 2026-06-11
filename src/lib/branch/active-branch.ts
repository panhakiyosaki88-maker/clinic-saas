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
  /**
   * Whether the user has made an explicit branch choice this session — either a
   * specific branch or "All branches". False means no valid cookie yet, so the
   * app should prompt them to pick a working branch on entry.
   */
  hasSelection: boolean;
}

/**
 * Resolves the active branch against the clinic's actual branches. A cookie
 * pointing at a branch that no longer belongs to this clinic (deleted, or left
 * over from a different clinic) is treated as "no selection" so the user is
 * re-prompted. An explicit "all" counts as a made selection.
 */
export async function getActiveBranchContext(): Promise<ActiveBranchContext> {
  const branches = await listBranches();
  const store = await cookies();
  const cookieRaw = store.get(ACTIVE_BRANCH_COOKIE)?.value ?? null;
  const cookieId = cookieRaw && cookieRaw !== "all" ? cookieRaw : null;
  const activeId =
    cookieId && branches.some((b) => b.id === cookieId) ? cookieId : null;
  const primaryId = branches.find((b) => b.is_primary)?.id ?? null;
  const hasSelection = cookieRaw === "all" || activeId !== null;
  return { activeId, branches, primaryId, hasSelection };
}

/**
 * The branch a newly-created record should belong to: an explicit per-form
 * choice when given, otherwise the active (top-bar) branch. Null only when the
 * user is working across "All branches" (record falls back to the primary
 * branch). Use this in create actions so new data lands on the chosen branch.
 */
export async function branchIdForWrite(explicit?: string | null): Promise<string | null> {
  if (explicit && explicit.length > 0) return explicit;
  const { activeId } = await getActiveBranchContext();
  return activeId;
}
