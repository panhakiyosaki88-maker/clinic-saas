"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PLANS } from "@/lib/plans";
import { ok, fail, type ActionResult } from "./types";

const changePlanSchema = z.object({ plan: z.enum(["starter", "professional", "enterprise"]) });

/**
 * Self-service plan change for a clinic owner. Updates the plan + its limits via
 * the service-role client (the subscriptions table is read-only to clinic users
 * — billing is the system of record). Real payment is a follow-up.
 */
export async function changePlan(input: { plan: string }): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.SUBSCRIPTION_MANAGE);
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a valid plan.");
  const def = PLANS[parsed.data.plan];

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      plan: def.key,
      status: "active",
      max_branches: def.maxBranches,
      max_doctors: def.maxDoctors,
      max_patients: def.maxPatients,
    })
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/settings/subscription");
  return ok(undefined);
}
