"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  membershipPlanSchema,
  assignMembershipSchema,
  type MembershipPlanInput,
  type AssignMembershipInput,
} from "@/lib/validations/membership";
import { ok, fail, type ActionResult } from "./types";

export async function createMembershipPlan(input: MembershipPlanInput): Promise<ActionResult<{ id: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = membershipPlanSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .insert({
      clinic_id: clinicId,
      name: v.name,
      price: v.price,
      benefit_type: v.benefitType,
      benefit_value: v.benefitValue,
      duration_days: v.durationDays ?? null,
      description: v.description || null,
      is_active: v.isActive ?? true,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Could not create plan.");

  revalidatePath("/billing/memberships");
  return ok({ id: data.id });
}

export async function updateMembershipPlan(id: string, input: MembershipPlanInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = membershipPlanSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("membership_plans")
    .update({
      name: v.name,
      price: v.price,
      benefit_type: v.benefitType,
      benefit_value: v.benefitValue,
      duration_days: v.durationDays ?? null,
      description: v.description || null,
      is_active: v.isActive ?? true,
    })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/billing/memberships");
  return ok(undefined);
}

export async function deleteMembershipPlan(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("membership_plans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/billing/memberships");
  return ok(undefined);
}

/** Enrols a patient in a plan; expiry derived from the plan's duration. */
export async function assignMembership(input: AssignMembershipInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const parsed = assignMembershipSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("duration_days")
    .eq("id", v.planId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!plan) return fail("Plan not found.");

  let expiresAt: string | null = null;
  if (plan.duration_days) {
    const d = new Date();
    d.setDate(d.getDate() + plan.duration_days);
    expiresAt = d.toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("patient_memberships").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    plan_id: v.planId,
    status: "active",
    expires_at: expiresAt,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/patients/${v.patientId}`);
  return ok(undefined);
}
