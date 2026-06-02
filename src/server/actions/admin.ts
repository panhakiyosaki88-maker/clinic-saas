"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { PLANS } from "@/lib/plans";
import { ok, fail, type ActionResult } from "./types";

const setStatusSchema = z.object({
  clinicId: z.string().uuid(),
  status: z.enum(["active", "suspended", "pending"]),
});

/** Super Admin: suspend / reactivate a clinic platform-wide. */
export async function setClinicStatus(input: { clinicId: string; status: string }): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("clinics")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/admin/clinics/${parsed.data.clinicId}`);
  revalidatePath("/admin/clinics");
  return ok(undefined);
}

const setPlanSchema = z.object({
  clinicId: z.string().uuid(),
  plan: z.enum(["starter", "professional", "enterprise"]),
});

/** Super Admin: change a clinic's plan + limits. */
export async function setClinicPlan(input: { clinicId: string; plan: string }): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = setPlanSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
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
    .eq("clinic_id", parsed.data.clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/admin/clinics/${parsed.data.clinicId}`);
  return ok(undefined);
}
