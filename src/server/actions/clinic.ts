"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, requireClinic } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createClinicSchema,
  updateClinicSchema,
  createBranchSchema,
  updateBranchSchema,
  slugify,
  type CreateClinicInput,
  type UpdateClinicInput,
  type CreateBranchInput,
  type UpdateBranchInput,
} from "@/lib/validations/clinic";
import { ok, fail, type ActionResult } from "./types";

/**
 * Onboards the authenticated user as the owner of a NEW clinic:
 *   1. creates the clinic, a trial subscription, and a primary branch
 *   2. stamps clinic_id + role='clinic_owner' into the user's app_metadata,
 *      so the next JWT carries the claims that RLS reads.
 *
 * Uses the service-role admin client because no clinic_id claim exists yet,
 * so RLS would otherwise block every write.
 */
export async function createClinic(
  input: CreateClinicInput
): Promise<ActionResult<{ clinicId: string }>> {
  const user = await requireUser();

  // A user can only own one clinic via onboarding (idempotency guard).
  const claims = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (typeof claims.clinic_id === "string" && claims.clinic_id) {
    return fail("This account already belongs to a clinic.");
  }

  const parsed = createClinicSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;
  const slug = (v.slug && v.slug.length > 0 ? v.slug : slugify(v.name)) || slugify(v.name);

  const admin = createAdminClient();

  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert({
      name: v.name,
      slug,
      owner_user_id: user.id,
      created_by: user.id,
      contact_email: v.contactEmail || user.email || null,
      contact_phone: v.contactPhone || null,
      country: v.country,
      timezone: v.timezone,
      currency: v.currency,
    })
    .select("id")
    .single();

  if (clinicErr || !clinic) {
    if (clinicErr?.code === "23505") {
      return fail("That clinic URL is taken. Try a different name or slug.", {
        slug: ["Already in use"],
      });
    }
    return fail(clinicErr?.message ?? "Could not create clinic.");
  }

  // Trial subscription (Starter). The billing system of record updates this later.
  const { error: subErr } = await admin.from("subscriptions").insert({
    clinic_id: clinic.id,
    plan: "starter",
    status: "trialing",
  });
  if (subErr) {
    // Roll back the clinic so onboarding can be retried cleanly.
    await admin.from("clinics").delete().eq("id", clinic.id);
    return fail("Could not start subscription. Please try again.");
  }

  // Primary branch.
  const { error: branchErr } = await admin.from("branches").insert({
    clinic_id: clinic.id,
    name: "Main Branch",
    code: "MAIN",
    is_primary: true,
    created_by: user.id,
  });
  if (branchErr) {
    await admin.from("clinics").delete().eq("id", clinic.id);
    return fail("Could not create the primary branch. Please try again.");
  }

  // Owner membership (RBAC, Module 3): the creator is the clinic_owner.
  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .eq("key", "clinic_owner")
    .is("clinic_id", null)
    .maybeSingle();
  if (ownerRole) {
    const { error: memErr } = await admin.from("memberships").insert({
      clinic_id: clinic.id,
      user_id: user.id,
      role_id: ownerRole.id,
      status: "active",
      created_by: user.id,
    });
    if (memErr) {
      await admin.from("clinics").delete().eq("id", clinic.id);
      return fail("Could not set up clinic ownership. Please try again.");
    }
  }

  // Stamp the JWT claims RLS depends on. Merge to avoid clobbering other metadata.
  const { error: claimErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...claims, clinic_id: clinic.id, role: "clinic_owner" },
  });
  if (claimErr) {
    await admin.from("clinics").delete().eq("id", clinic.id);
    return fail("Could not finalize your account. Please try again.");
  }

  revalidatePath("/", "layout");
  return ok({ clinicId: clinic.id });
}

/** Clinic owner updates their clinic profile (RLS enforces ownership). */
export async function updateClinic(
  input: UpdateClinicInput
): Promise<ActionResult> {
  const { clinicId } = await requireClinic();
  const parsed = updateClinicSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.contactEmail !== undefined ? { contact_email: v.contactEmail || null } : {}),
      ...(v.contactPhone !== undefined ? { contact_phone: v.contactPhone || null } : {}),
      ...(v.timezone !== undefined ? { timezone: v.timezone } : {}),
      ...(v.currency !== undefined ? { currency: v.currency } : {}),
    })
    .eq("id", clinicId);

  if (error) return fail(error.message);
  revalidatePath("/settings/clinic");
  return ok(undefined);
}

/** Sets (or clears) the clinic's logo path after a client upload to Storage. */
export async function setClinicLogo(logoPath: string | null): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.CLINIC_MANAGE);
  if (logoPath && !logoPath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  // Best-effort removal of the previous logo object.
  const { data: prev } = await supabase
    .from("clinics")
    .select("logo_path")
    .eq("id", clinicId)
    .maybeSingle();
  if (prev?.logo_path && prev.logo_path !== logoPath) {
    await supabase.storage.from("clinic-logos").remove([prev.logo_path]);
  }

  const { error } = await supabase
    .from("clinics")
    .update({ logo_path: logoPath })
    .eq("id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/settings/clinic");
  revalidatePath("/", "layout");
  return ok(undefined);
}

/** Sets (or clears) a branch's payment QR path after a client upload to Storage. */
export async function setBranchPaymentQr(
  branchId: string,
  qrPath: string | null
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.CLINIC_MANAGE);
  if (qrPath && !qrPath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  // Best-effort removal of the previous QR object.
  const { data: prev } = await supabase
    .from("branches")
    .select("payment_qr_path")
    .eq("id", branchId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (prev?.payment_qr_path && prev.payment_qr_path !== qrPath) {
    await supabase.storage.from("payment-qrs").remove([prev.payment_qr_path]);
  }

  const { error } = await supabase
    .from("branches")
    .update({ payment_qr_path: qrPath })
    .eq("id", branchId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/settings/branches");
  return ok(undefined);
}

/** Clinic owner adds a branch (RLS + insert policy enforce clinic + role). */
export async function createBranch(
  input: CreateBranchInput
): Promise<ActionResult<{ branchId: string }>> {
  const { clinicId } = await requireClinic();
  const parsed = createBranchSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .insert({
      clinic_id: clinicId,
      name: v.name,
      code: v.code || null,
      address: v.address || null,
      phone: v.phone || null,
      is_primary: v.isPrimary,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return fail("A branch with that code already exists.", { code: ["Already in use"] });
    }
    return fail(error?.message ?? "Could not create branch.");
  }

  revalidatePath("/settings/branches");
  return ok({ branchId: data.id });
}

/** Clinic owner edits a branch. Promoting to primary demotes the others so a
 *  clinic always has exactly one primary location. */
export async function updateBranch(input: UpdateBranchInput): Promise<ActionResult> {
  const { clinicId } = await requireClinic();
  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();

  // Single primary per clinic: demote the others before promoting this one.
  if (v.isPrimary) {
    const { error: demoteErr } = await supabase
      .from("branches")
      .update({ is_primary: false })
      .eq("clinic_id", clinicId)
      .neq("id", v.id);
    if (demoteErr) return fail(demoteErr.message);
  }

  const { error } = await supabase
    .from("branches")
    .update({
      name: v.name,
      code: v.code || null,
      address: v.address || null,
      phone: v.phone || null,
      // Only ever set primary here; clearing it happens by promoting another.
      ...(v.isPrimary ? { is_primary: true } : {}),
    })
    .eq("id", v.id)
    .eq("clinic_id", clinicId);

  if (error) {
    if (error.code === "23505") {
      return fail("A branch with that code already exists.", { code: ["Already in use"] });
    }
    return fail(error.message);
  }

  revalidatePath("/settings/branches");
  return ok(undefined);
}
