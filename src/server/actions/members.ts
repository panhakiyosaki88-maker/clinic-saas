"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  inviteMemberSchema,
  changeRoleSchema,
  membershipIdSchema,
  type InviteMemberInput,
  type ChangeRoleInput,
} from "@/lib/validations/member";
import { ok, fail, type ActionResult } from "./types";

/** Resolves a system role's id from its key (clinic_id IS NULL). */
async function systemRoleId(
  admin: ReturnType<typeof createAdminClient>,
  key: string
): Promise<string | null> {
  const { data } = await admin
    .from("roles")
    .select("id")
    .eq("key", key)
    .is("clinic_id", null)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Invites a user to the clinic with a role.
 * - If a user with that email already exists and has no clinic yet, they're
 *   added immediately (active) and their JWT claims are stamped.
 * - Otherwise a pending invitation is recorded; they claim it after signing up
 *   (acceptInvitation). Email delivery is wired when the notifications module lands.
 */
export async function inviteMember(
  input: InviteMemberInput
): Promise<ActionResult<{ status: "active" | "invited" }>> {
  const { clinicId } = await requirePermission(PERMISSIONS.STAFF_MANAGE);
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const email = parsed.data.email.toLowerCase();
  const admin = createAdminClient();

  const roleId = await systemRoleId(admin, parsed.data.roleKey);
  if (!roleId) return fail("Unknown role.");

  // Already a member of this clinic?
  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("clinic_id", clinicId)
    .or(`invited_email.eq.${email},user_id.eq.${(await lookupUserId(admin, email)) ?? "00000000-0000-0000-0000-000000000000"}`)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return fail("That person is already invited or a member.");

  const userId = await lookupUserId(admin, email);

  if (userId) {
    // Existing user: block if they already belong to a clinic (one-clinic MVP).
    const { data: userResp } = await admin.auth.admin.getUserById(userId);
    const claimClinic = (userResp.user?.app_metadata as Record<string, unknown> | undefined)?.clinic_id;
    if (typeof claimClinic === "string" && claimClinic) {
      return fail("That user already belongs to a clinic.");
    }

    const { error: insErr } = await admin.from("memberships").insert({
      clinic_id: clinicId,
      user_id: userId,
      role_id: roleId,
      status: "active",
    });
    if (insErr) return fail(insErr.message);

    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(userResp.user?.app_metadata ?? {}),
        clinic_id: clinicId,
        role: parsed.data.roleKey,
      },
    });
    revalidatePath("/settings/staff");
    return ok({ status: "active" });
  }

  // No user yet → pending invitation.
  const { error: invErr } = await admin.from("memberships").insert({
    clinic_id: clinicId,
    role_id: roleId,
    invited_email: email,
    status: "invited",
  });
  if (invErr) return fail(invErr.message);

  revalidatePath("/settings/staff");
  return ok({ status: "invited" });
}

async function lookupUserId(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return data?.id ?? null;
}

/** Changes a member's role (and re-stamps their JWT claim if they've accepted). */
export async function changeMemberRole(input: ChangeRoleInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.STAFF_MANAGE);
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("memberships")
    .select("id, user_id, clinic_id")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  if (!membership || membership.clinic_id !== clinicId) return fail("Member not found.");
  if (membership.user_id === user.id) return fail("You can't change your own role.");

  const roleId = await systemRoleId(admin, parsed.data.roleKey);
  if (!roleId) return fail("Unknown role.");

  const { error } = await admin
    .from("memberships")
    .update({ role_id: roleId })
    .eq("id", membership.id);
  if (error) return fail(error.message);

  if (membership.user_id) {
    const { data: u } = await admin.auth.admin.getUserById(membership.user_id);
    await admin.auth.admin.updateUserById(membership.user_id, {
      app_metadata: { ...(u.user?.app_metadata ?? {}), role: parsed.data.roleKey },
    });
  }

  revalidatePath("/settings/staff");
  return ok(undefined);
}

/** Soft-disables a membership and revokes the user's clinic claim. */
export async function disableMember(input: { membershipId: string }): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.STAFF_MANAGE);
  const parsed = membershipIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("memberships")
    .select("id, user_id, clinic_id")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  if (!membership || membership.clinic_id !== clinicId) return fail("Member not found.");
  if (membership.user_id === user.id) return fail("You can't remove yourself.");

  const { error } = await admin
    .from("memberships")
    .update({ status: "disabled", deleted_at: new Date().toISOString() })
    .eq("id", membership.id);
  if (error) return fail(error.message);

  if (membership.user_id) {
    const { data: u } = await admin.auth.admin.getUserById(membership.user_id);
    const meta = { ...(u.user?.app_metadata ?? {}) } as Record<string, unknown>;
    delete meta.clinic_id;
    delete meta.role;
    await admin.auth.admin.updateUserById(membership.user_id, { app_metadata: meta });
  }

  revalidatePath("/settings/staff");
  return ok(undefined);
}

/**
 * Claims any pending invitation matching the signed-in user's email. Called
 * from the post-login flow for users who don't yet belong to a clinic.
 */
export async function acceptInvitation(): Promise<ActionResult<{ clinicId: string } | null>> {
  const user = await requireUser();
  const email = user.email?.toLowerCase();
  if (!email) return ok(null);

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("memberships")
    .select("id, clinic_id, role_id")
    .eq("invited_email", email)
    .eq("status", "invited")
    .is("deleted_at", null)
    .maybeSingle();
  if (!invite) return ok(null);

  const { data: role } = await admin
    .from("roles")
    .select("key")
    .eq("id", invite.role_id)
    .maybeSingle();

  const { error } = await admin
    .from("memberships")
    .update({ user_id: user.id, status: "active", invited_email: null })
    .eq("id", invite.id);
  if (error) return fail(error.message);

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      clinic_id: invite.clinic_id,
      role: role?.key ?? "receptionist",
    },
  });

  // Caller must refresh the session so the new claims take effect.
  const supabase = await createClient();
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  return ok({ clinicId: invite.clinic_id });
}
