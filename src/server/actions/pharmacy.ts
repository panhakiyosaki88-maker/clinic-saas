"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createMedicineSchema,
  updateMedicineSchema,
  recordTransactionSchema,
  ADDING_REASONS,
  type CreateMedicineInput,
  type UpdateMedicineInput,
  type RecordTransactionInput,
} from "@/lib/validations/medicine";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";
import { skuBase, skuSequence } from "@/lib/pharmacy/sku";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type MedicineWrite = Database["public"]["Tables"]["medicines"]["Update"];

function toColumns(v: Partial<CreateMedicineInput>): MedicineWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const out: MedicineWrite = {};
  if (v.name !== undefined) out.name = v.name;
  if (v.genericName !== undefined) out.generic_name = orNull(v.genericName);
  if (v.strength !== undefined) out.strength = orNull(v.strength);
  if (v.category !== undefined) out.category = orNull(v.category);
  if (v.unit !== undefined) out.unit = v.unit;
  if (v.reorderLevel !== undefined) out.reorder_level = v.reorderLevel;
  if (v.purchasePrice !== undefined) out.purchase_price = v.purchasePrice ?? null;
  if (v.sellingPrice !== undefined) out.selling_price = v.sellingPrice ?? null;
  if (v.isActive !== undefined) out.is_active = v.isActive;
  return out;
}

const escapeLike = (s: string) => s.replace(/[%_\\]/g, "\\$&");

/**
 * Computes the next SKU for a medicine-strength combination within a clinic:
 * the base (PREFIX + STRENGTH) plus the next zero-padded sequence. Existing
 * SKUs sharing the base — including soft-deleted ones — are scanned so numbers
 * are never reused. A DB unique index is the final guard against races.
 */
async function generateSku(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  name: string,
  strength: string | undefined | null
): Promise<string> {
  const base = skuBase(name, strength);
  const { data } = await supabase
    .from("medicines")
    .select("sku")
    .eq("clinic_id", clinicId)
    .ilike("sku", `${escapeLike(base)}-%`);

  const seqRe = new RegExp(`^${base}-(\\d+)$`, "i");
  let max = 0;
  for (const row of data ?? []) {
    const m = row.sku?.match(seqRe);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${base}-${skuSequence(max + 1)}`;
}

/** Live SKU preview for the form (the real sequence is assigned on save). */
export async function previewSku(
  name: string,
  strength?: string
): Promise<ActionResult<{ sku: string }>> {
  const { clinicId } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  if (!name || name.trim().length < 2) return ok({ sku: "" });
  const supabase = await createClient();
  return ok({ sku: await generateSku(supabase, clinicId, name, strength) });
}

export async function createMedicine(
  input: CreateMedicineInput
): Promise<ActionResult<{ medicineId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const te = await getErrorT();
  const parsed = createMedicineSchema.safeParse(input);
  if (!parsed.success) {
    return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  }

  const v = parsed.data;
  const supabase = await createClient();
  const manual = v.autoSku === false;
  const cols = toColumns(v);

  if (manual) {
    const sku = (v.sku ?? "").trim();
    if (!sku) {
      return fail(te("fixFields"), { sku: [te("medicine.skuOrAuto")] });
    }
    const { data, error } = await supabase
      .from("medicines")
      .insert({ clinic_id: clinicId, created_by: user.id, ...cols, name: v.name, sku })
      .select("id")
      .single();
    if (error?.code === "23505") {
      return fail(te("fixFields"), { sku: [te("medicine.skuInUse")] });
    }
    if (error || !data) return fail(error?.message ?? te("medicine.createFailed"));
    revalidatePath("/pharmacy");
    return ok({ medicineId: data.id });
  }

  // Auto-generate: retry across the unique index in case of a concurrent insert.
  for (let attempt = 0; attempt < 5; attempt++) {
    const sku = await generateSku(supabase, clinicId, v.name, v.strength);
    const { data, error } = await supabase
      .from("medicines")
      .insert({ clinic_id: clinicId, created_by: user.id, ...cols, name: v.name, sku })
      .select("id")
      .single();
    if (error?.code === "23505") continue;
    if (error || !data) return fail(error?.message ?? te("medicine.createFailed"));
    revalidatePath("/pharmacy");
    return ok({ medicineId: data.id });
  }
  return fail(te("medicine.skuGenFailed"));
}

export async function updateMedicine(
  medicineId: string,
  input: UpdateMedicineInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const te = await getErrorT();
  const parsed = updateMedicineSchema.safeParse(input);
  if (!parsed.success) {
    return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  }

  const v = parsed.data;
  const supabase = await createClient();
  const cols = toColumns(v);

  // SKU is a stable identifier: keep it on edit unless manually overridden, or
  // auto-fill it when the medicine doesn't have one yet.
  if (v.autoSku === false) {
    const sku = (v.sku ?? "").trim();
    if (!sku) {
      return fail(te("fixFields"), { sku: [te("medicine.skuOrAuto")] });
    }
    cols.sku = sku;
  } else {
    const { data: current } = await supabase
      .from("medicines")
      .select("sku")
      .eq("id", medicineId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (current && !current.sku && v.name) {
      cols.sku = await generateSku(supabase, clinicId, v.name, v.strength);
    }
  }

  const { error } = await supabase
    .from("medicines")
    .update(cols)
    .eq("id", medicineId)
    .eq("clinic_id", clinicId);
  if (error?.code === "23505") {
    return fail(te("fixFields"), { sku: [te("medicine.skuInUse")] });
  }
  if (error) return fail(error.message);

  revalidatePath(`/pharmacy/${medicineId}`);
  revalidatePath("/pharmacy");
  return ok(undefined);
}

export async function deleteMedicine(medicineId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("medicines")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", medicineId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/pharmacy");
  return ok(undefined);
}

/**
 * Records a stock movement. The signed `change` is derived from the reason
 * (purchase/return add; dispense/expiry remove; adjustment uses `direction`).
 * Removals are blocked from overdrawing stock. The DB trigger updates the cache.
 */
export async function recordTransaction(input: RecordTransactionInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const parsed = recordTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const adds =
    (ADDING_REASONS as readonly string[]).includes(v.reason) ||
    (v.reason === "adjustment" && v.direction !== "decrease");
  const change = adds ? v.quantity : -v.quantity;

  const supabase = await createClient();

  // Guard against overdrawing stock on removals.
  if (change < 0) {
    const { data: med } = await supabase
      .from("medicines")
      .select("stock_quantity")
      .eq("id", v.medicineId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (!med) return fail("Medicine not found.");
    if (med.stock_quantity + change < 0) {
      return fail(`Only ${med.stock_quantity} in stock.`);
    }
  }

  const { error } = await supabase.from("inventory_transactions").insert({
    clinic_id: clinicId,
    medicine_id: v.medicineId,
    branch_id: v.branchId || null,
    change,
    reason: v.reason,
    batch_number: v.batchNumber || null,
    expiry_date: v.expiryDate || null,
    unit_cost: v.unitCost ?? null,
    note: v.note || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/pharmacy/${v.medicineId}`);
  revalidatePath("/pharmacy");
  return ok(undefined);
}
