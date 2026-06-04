"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { servicePriceSchema, type ServicePriceInput } from "@/lib/validations/service-price";
import { ok, fail, type ActionResult } from "./types";

export async function createServicePrice(input: ServicePriceInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = servicePriceSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("service_prices").insert({
    clinic_id: clinicId,
    name: v.name,
    category: v.category,
    code: v.code || null,
    unit_price: v.unitPrice,
    branch_id: v.branchId || null,
    effective_from: v.effectiveFrom || undefined,
    created_by: user.id,
  });
  if (error) return fail(error.message);
  revalidatePath("/billing/catalog");
  return ok(undefined);
}

export async function updateServicePrice(id: string, input: ServicePriceInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = servicePriceSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_prices")
    .update({
      name: v.name,
      category: v.category,
      code: v.code || null,
      unit_price: v.unitPrice,
      branch_id: v.branchId || null,
      effective_from: v.effectiveFrom || undefined,
    })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/billing/catalog");
  return ok(undefined);
}

/** Archive / restore a catalog entry (kept for history, hidden from pickers). */
export async function setServicePriceArchived(id: string, archived: boolean): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_prices")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/billing/catalog");
  return ok(undefined);
}
