/** The active branch + the clinic's primary branch, passed into list queries. */
export interface BranchScope {
  activeId: string | null;
  primaryId: string | null;
}

/**
 * Applies the active-branch filter to a Supabase query builder.
 *
 * Branch assignment is optional and a blank `branch_id` means "the clinic's
 * primary branch" (see the Branch plan). So:
 *   - active = null  ("All branches")        → no filter
 *   - active = the primary branch            → rows on that branch OR unassigned
 *   - active = any other branch              → rows on exactly that branch
 *
 * Generic over the builder type so `.eq()` / `.or()` keep returning the same
 * fluent Postgrest builder (works for any table that has a `branch_id` column).
 */
export function applyBranchFilter<
  Q extends { eq(column: string, value: string): Q; or(filters: string): Q }
>(query: Q, activeId: string | null, primaryId: string | null): Q {
  if (!activeId) return query;
  if (primaryId && activeId === primaryId) {
    return query.or(`branch_id.eq.${activeId},branch_id.is.null`);
  }
  return query.eq("branch_id", activeId);
}
