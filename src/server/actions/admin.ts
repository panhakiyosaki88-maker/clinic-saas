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

// ============================================================================
// Account approval & deletion
// ============================================================================

const userIdSchema = z.object({ userId: z.string().uuid() });

/** Super Admin: approve a pending account so it can set up its clinic. */
export async function approveUser(input: { userId: string }): Promise<ActionResult> {
  const admin_user = await requireSuperAdmin();
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: admin_user.id })
    .eq("id", parsed.data.userId);
  if (error) return fail(error.message);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return ok(undefined);
}

/** Super Admin: decline a pending account (keeps the row, blocks access). */
export async function rejectUser(input: { userId: string }): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status: "rejected", approved_at: null, approved_by: null })
    .eq("id", parsed.data.userId);
  if (error) return fail(error.message);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return ok(undefined);
}

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  // The Super Admin must retype the target's email to confirm deletion.
  confirmEmail: z.string().trim().min(1),
});

/**
 * Super Admin: permanently delete a user account and the data that belongs to
 * it. Deleting the auth user cascades to the profile and the user's
 * memberships (both FK `on delete cascade`). Clinic-scoped clinical/financial
 * records are owned by the clinic, not the user, and are intentionally left
 * intact. Requires retyping the account email as a guard.
 */
export async function deleteUser(input: {
  userId: string;
  confirmEmail: string;
}): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { userId, confirmEmail } = parsed.data;

  if (userId === actor.id) return fail("You can't delete your own account.");

  const admin = createAdminClient();

  // Confirm the account exists and the typed email matches exactly.
  const { data: profile, error: readErr } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!profile) return fail("Account not found.");
  if ((profile.email ?? "").toLowerCase() !== confirmEmail.toLowerCase()) {
    return fail("The email you typed doesn't match this account.");
  }

  // Never let one Super Admin delete another through this tool.
  const { data: target } = await admin.auth.admin.getUserById(userId);
  if ((target.user?.app_metadata as Record<string, unknown> | undefined)?.role === "super_admin") {
    return fail("Super admin accounts can't be deleted here.");
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return fail(error.message);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return ok(undefined);
}
