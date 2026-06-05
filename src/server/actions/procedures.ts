"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { procedureSchema, type ProcedureInput } from "@/lib/validations/procedure";
import { ok, fail, type ActionResult } from "./types";

export async function createProcedure(input: ProcedureInput): Promise<ActionResult<{ id: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedures")
    .insert({
      clinic_id: clinicId,
      name: v.name,
      code: v.code || null,
      default_price: v.defaultPrice,
      description: v.description || null,
      is_active: v.isActive ?? true,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Could not create procedure.");

  revalidatePath("/billing/procedures");
  return ok({ id: data.id });
}

export async function updateProcedure(id: string, input: ProcedureInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("procedures")
    .update({
      name: v.name,
      code: v.code || null,
      default_price: v.defaultPrice,
      description: v.description || null,
      is_active: v.isActive ?? true,
    })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/billing/procedures");
  return ok(undefined);
}

export async function deleteProcedure(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("procedures")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/billing/procedures");
  return ok(undefined);
}
