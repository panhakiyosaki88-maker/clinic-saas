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
import type { Database } from "@/types/database";

type MedicineWrite = Database["public"]["Tables"]["medicines"]["Update"];

function toColumns(v: Partial<CreateMedicineInput>): MedicineWrite {
  const orNull = (s: string | undefined) => (s && s.length > 0 ? s : null);
  const out: MedicineWrite = {};
  if (v.name !== undefined) out.name = v.name;
  if (v.genericName !== undefined) out.generic_name = orNull(v.genericName);
  if (v.sku !== undefined) out.sku = orNull(v.sku);
  if (v.category !== undefined) out.category = orNull(v.category);
  if (v.unit !== undefined) out.unit = v.unit;
  if (v.reorderLevel !== undefined) out.reorder_level = v.reorderLevel;
  if (v.purchasePrice !== undefined) out.purchase_price = v.purchasePrice ?? null;
  if (v.sellingPrice !== undefined) out.selling_price = v.sellingPrice ?? null;
  if (v.isActive !== undefined) out.is_active = v.isActive;
  return out;
}

export async function createMedicine(
  input: CreateMedicineInput
): Promise<ActionResult<{ medicineId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const parsed = createMedicineSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medicines")
    .insert({ clinic_id: clinicId, created_by: user.id, ...toColumns(parsed.data), name: parsed.data.name })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Could not create medicine.");

  revalidatePath("/pharmacy");
  return ok({ medicineId: data.id });
}

export async function updateMedicine(
  medicineId: string,
  input: UpdateMedicineInput
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const parsed = updateMedicineSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("medicines")
    .update(toColumns(parsed.data))
    .eq("id", medicineId)
    .eq("clinic_id", clinicId);
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
