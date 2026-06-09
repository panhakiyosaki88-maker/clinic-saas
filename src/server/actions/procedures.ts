"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveOpenVisitId } from "@/lib/db/open-visit";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  procedureSchema,
  procedureCategorySchema,
  createProcedureOrderSchema,
  changeProcedureStatusSchema,
  saveProcedureRecordSchema,
  type ProcedureInput,
  type ProcedureCategoryInput,
  type CreateProcedureOrderInput,
  type ChangeProcedureStatusInput,
  type SaveProcedureRecordInput,
} from "@/lib/validations/procedure";
import { PROCEDURE_CATALOG } from "@/lib/procedures/catalog";
import { isImagingReserved } from "@/lib/imaging/catalog";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";

// ============================================================================
// Catalog services (the `procedures` table). Editable from the Procedures module
// (procedures.write) and the legacy billing settings screen (billing.write).
// ============================================================================
export async function createProcedure(input: ProcedureInput): Promise<ActionResult<{ id: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  return insertProcedure(clinicId, user.id, input, "/settings/billing/procedures");
}

export async function updateProcedure(id: string, input: ProcedureInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  return mutateProcedure(clinicId, id, input, "/settings/billing/procedures");
}

export async function deleteProcedure(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  return softDeleteProcedure(clinicId, id, "/settings/billing/procedures");
}

// Procedures-module catalog actions (clinical roles via procedures.write).
export async function createProcedureService(input: ProcedureInput): Promise<ActionResult<{ id: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  return insertProcedure(clinicId, user.id, input, "/procedures/services");
}

export async function updateProcedureService(id: string, input: ProcedureInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  return mutateProcedure(clinicId, id, input, "/procedures/services");
}

export async function deleteProcedureService(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  return softDeleteProcedure(clinicId, id, "/procedures/services");
}

async function insertProcedure(
  clinicId: string,
  userId: string,
  input: ProcedureInput,
  revalidate: string
): Promise<ActionResult<{ id: string }>> {
  const te = await getErrorT();
  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;
  // Classification guard: an imaging study (ECG, X-Ray, …) can never be a procedure.
  if (isImagingReserved(v.name)) return fail(te("procedure.isImaging"));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedures")
    .insert({
      clinic_id: clinicId,
      name: v.name,
      code: v.code || null,
      category_id: v.categoryId || null,
      default_price: v.defaultPrice,
      description: v.description || null,
      is_active: v.isActive ?? true,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return fail("A procedure with that name already exists.");
    return fail(error?.message ?? te("procedure.createFailed"));
  }
  revalidatePath(revalidate);
  return ok({ id: data.id });
}

async function mutateProcedure(clinicId: string, id: string, input: ProcedureInput, revalidate: string): Promise<ActionResult> {
  const te = await getErrorT();
  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;
  if (isImagingReserved(v.name)) return fail(te("procedure.isImaging"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("procedures")
    .update({
      name: v.name,
      code: v.code || null,
      category_id: v.categoryId || null,
      default_price: v.defaultPrice,
      description: v.description || null,
      is_active: v.isActive ?? true,
    })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(revalidate);
  return ok(undefined);
}

async function softDeleteProcedure(clinicId: string, id: string, revalidate: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("procedures")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(revalidate);
  return ok(undefined);
}

// ============================================================================
// Categories
// ============================================================================
export async function createProcedureCategory(input: ProcedureCategoryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const te = await getErrorT();
  const parsed = procedureCategorySchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const supabase = await createClient();
  const { error } = await supabase.from("procedure_categories").insert({
    clinic_id: clinicId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    parent_id: parsed.data.parentId || null,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return fail("A category with that name already exists.");
    return fail(error.message);
  }
  revalidatePath("/procedures/services");
  return ok(undefined);
}

export async function deleteProcedureCategory(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const supabase = await createClient();
  const { error } = await supabase.from("procedure_categories").delete().eq("id", id).eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/procedures/services");
  return ok(undefined);
}

/** Seeds the standard procedure catalog (categories + services). Idempotent. */
export async function seedProcedureCatalog(): Promise<ActionResult<{ created: number }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const supabase = await createClient();

  const [{ data: cats }, { data: svcs }] = await Promise.all([
    supabase.from("procedure_categories").select("id, name"),
    supabase.from("procedures").select("name").is("deleted_at", null),
  ]);
  const catByName = new Map((cats ?? []).map((c) => [c.name, c.id]));
  const haveService = new Set((svcs ?? []).map((s) => s.name));
  let created = 0;

  for (const group of PROCEDURE_CATALOG) {
    let categoryId = catByName.get(group.title);
    if (!categoryId) {
      const { data } = await supabase
        .from("procedure_categories")
        .insert({ clinic_id: clinicId, name: group.title, created_by: user.id })
        .select("id")
        .single();
      if (data) {
        categoryId = data.id;
        catByName.set(group.title, categoryId);
        created++;
      }
    }
    const missing = group.services.filter((s) => !haveService.has(s));
    if (missing.length > 0) {
      const { data } = await supabase
        .from("procedures")
        .insert(missing.map((name) => ({ clinic_id: clinicId, category_id: categoryId ?? null, name, created_by: user.id })))
        .select("name");
      created += data?.length ?? 0;
      for (const s of data ?? []) haveService.add(s.name);
    }
  }
  revalidatePath("/procedures/services");
  return ok({ created });
}

// ============================================================================
// Order workflow: Order -> Perform -> Complete -> Billing
// ============================================================================
export async function createProcedureOrder(
  input: CreateProcedureOrderInput
): Promise<ActionResult<{ orderIds: string[] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const te = await getErrorT();
  const parsed = createProcedureOrderSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;
  const names = Array.from(new Set(v.serviceNames));

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("procedures")
    .select("id, name, category_id, default_price")
    .in("name", names)
    .is("deleted_at", null);
  const svcByName = new Map((services ?? []).map((s) => [s.name, s]));

  const visitId = await resolveOpenVisitId(supabase, v.patientId);
  const { data, error } = await supabase
    .from("procedure_orders")
    .insert(
      names.map((name) => {
        const svc = svcByName.get(name);
        return {
          clinic_id: clinicId,
          patient_id: v.patientId,
          doctor_id: v.doctorId || null,
          branch_id: v.branchId || null,
          visit_id: visitId,
          category_id: svc?.category_id ?? null,
          procedure_id: svc?.id ?? null,
          procedure_name: name,
          price: Number(svc?.default_price ?? 0),
          notes: v.notes || null,
          created_by: user.id,
        };
      })
    )
    .select("id");
  if (error || !data || data.length === 0) return fail(error?.message ?? te("procedure.createFailed"));

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "procedure",
    title: names.length === 1 ? "Procedure ordered" : `${names.length} procedures ordered`,
    description: names.join(", "),
    created_by: user.id,
  });

  revalidatePath("/procedures");
  revalidatePath(`/patients/${v.patientId}`);
  return ok({ orderIds: data.map((r) => r.id) });
}

export async function changeProcedureStatus(input: ChangeProcedureStatusInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const parsed = changeProcedureStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { orderId, status } = parsed.data;
  const now = new Date().toISOString();

  const supabase = await createClient();
  const { data: order, error: readErr } = await supabase
    .from("procedure_orders")
    .select("id, clinic_id, patient_id, visit_id, doctor_id, procedure_id, procedure_name, price, quantity")
    .eq("id", orderId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (readErr || !order) return fail(readErr?.message ?? "Order not found.");

  const patch: { status: typeof status; performed_at?: string; completed_at?: string } = { status };
  if (status === "performed") patch.performed_at = now;
  if (status === "completed") patch.completed_at = now;

  const { error } = await supabase.from("procedure_orders").update(patch).eq("id", orderId).eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  // Completing an order writes the single billing snapshot the workspace detects
  // (one billing path, no double-billing). Cancelling frees that snapshot.
  if (status === "completed") {
    const { data: existing } = await supabase
      .from("visit_procedures")
      .select("id")
      .eq("procedure_order_id", orderId)
      .maybeSingle();
    const snapshot = {
      clinic_id: clinicId,
      visit_id: order.visit_id,
      patient_id: order.patient_id,
      procedure_id: order.procedure_id,
      procedure_order_id: orderId,
      doctor_id: order.doctor_id,
      name: order.procedure_name,
      price: Number(order.price),
      quantity: Number(order.quantity),
      performed_at: now,
      deleted_at: null,
    };
    if (existing) {
      await supabase.from("visit_procedures").update(snapshot).eq("id", existing.id);
    } else {
      await supabase.from("visit_procedures").insert({ ...snapshot, created_by: user.id });
    }
  } else if (status === "cancelled") {
    await supabase
      .from("visit_procedures")
      .update({ deleted_at: now })
      .eq("procedure_order_id", orderId)
      .eq("clinic_id", clinicId);
  }

  revalidatePath("/procedures", "layout");
  return ok(undefined);
}

/** Saves (upserts) the clinical record; advances the order to 'performed'. */
export async function saveProcedureRecord(input: SaveProcedureRecordInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const te = await getErrorT();
  const parsed = saveProcedureRecordSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("procedure_records")
    .select("id")
    .eq("procedure_order_id", v.orderId)
    .limit(1)
    .maybeSingle();

  const payload = { clinical_notes: v.clinicalNotes || null, outcome: v.outcome || null };
  if (existing) {
    const { error } = await supabase.from("procedure_records").update(payload).eq("id", existing.id).eq("clinic_id", clinicId);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase
      .from("procedure_records")
      .insert({ clinic_id: clinicId, procedure_order_id: v.orderId, created_by: user.id, ...payload });
    if (error) return fail(error.message);
  }

  // Documenting performance advances an 'ordered' order to 'performed'.
  await supabase
    .from("procedure_orders")
    .update({ status: "performed", performed_at: new Date().toISOString() })
    .eq("id", v.orderId)
    .eq("clinic_id", clinicId)
    .eq("status", "ordered");

  revalidatePath("/procedures", "layout");
  return ok(undefined);
}

export async function deleteProcedureOrder(orderId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PROCEDURES_WRITE);
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("procedure_orders")
    .update({ deleted_at: now })
    .eq("id", orderId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  // Free any billing snapshot tied to this order.
  await supabase.from("visit_procedures").update({ deleted_at: now }).eq("procedure_order_id", orderId).eq("clinic_id", clinicId);
  revalidatePath("/procedures");
  return ok(undefined);
}
