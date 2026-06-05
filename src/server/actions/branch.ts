"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireClinic } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/queries/clinic";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch/active-branch";
import { ok, fail, type ActionResult } from "./types";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Sets the active branch for the current browser. Pass null (or "all") to clear
 * the scope back to "All branches". Revalidates the whole layout so every server
 * component re-reads the new scope.
 */
export async function setActiveBranch(
  branchId: string | null
): Promise<ActionResult> {
  await requireClinic();
  const store = await cookies();

  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: ONE_YEAR,
  };

  if (!branchId || branchId === "all") {
    store.set(ACTIVE_BRANCH_COOKIE, "all", cookieOpts);
    revalidatePath("/", "layout");
    return ok(undefined);
  }

  // Only accept a branch that belongs to the caller's clinic.
  const branches = await listBranches();
  if (!branches.some((b) => b.id === branchId)) {
    return fail("Unknown branch.");
  }

  store.set(ACTIVE_BRANCH_COOKIE, branchId, cookieOpts);
  revalidatePath("/", "layout");
  return ok(undefined);
}
