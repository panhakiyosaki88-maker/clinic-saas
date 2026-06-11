"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { servicePriceSchema, type ServicePriceInput } from "@/lib/validations/service-price";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";

export async function createServicePrice(input: ServicePriceInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const te = await getErrorT();
  const parsed = servicePriceSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
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
  revalidatePath("/settings/billing/catalog");
  return ok(undefined);
}

export async function updateServicePrice(id: string, input: ServicePriceInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const te = await getErrorT();
  const parsed = servicePriceSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
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
  revalidatePath("/settings/billing/catalog");
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
  revalidatePath("/settings/billing/catalog");
  return ok(undefined);
}

/** Module catalogs whose prices are also editable from the Price Catalog page.
 *  Each owns its own table with a `default_price` column. */
export type ModulePriceSource = "lab" | "imaging" | "procedure";

const MODULE_REVALIDATE: Record<ModulePriceSource, string> = {
  lab: "/lab",
  imaging: "/imaging",
  procedure: "/procedures",
};

/**
 * Updates the price of a Laboratory test, Imaging service or Procedure from the
 * unified Price Catalog. Only the price changes here; names/codes stay managed
 * in each module. Gated by billing.write since this is the billing catalog.
 */
export async function updateModuleCatalogPrice(
  source: ModulePriceSource,
  id: string,
  price: number
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const te = await getErrorT();
  if (!Number.isFinite(price) || price < 0) return fail(te("fixFields"));

  const patch = { default_price: price };
  const supabase = await createClient();
  const { error } =
    source === "lab"
      ? await supabase.from("lab_categories").update(patch).eq("id", id).eq("clinic_id", clinicId)
      : source === "imaging"
        ? await supabase.from("imaging_services").update(patch).eq("id", id).eq("clinic_id", clinicId)
        : await supabase.from("procedures").update(patch).eq("id", id).eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/settings/billing/catalog");
  revalidatePath(MODULE_REVALIDATE[source]);
  return ok(undefined);
}

/**
 * Permanently removes a catalog entry. Safe because invoices snapshot their own
 * amounts (no foreign key back to service_prices) — past bills are unaffected.
 * Use Archive instead to keep the row for history but hide it from pickers.
 */
export async function deleteServicePrice(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_prices")
    .delete()
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/settings/billing/catalog");
  return ok(undefined);
}
