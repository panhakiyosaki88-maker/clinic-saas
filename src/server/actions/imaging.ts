"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveOpenVisitId } from "@/lib/db/open-visit";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  imagingCategorySchema,
  imagingServiceSchema,
  createImagingRequestSchema,
  changeImagingStatusSchema,
  saveImagingResultSchema,
  addImagingFileSchema,
  type ImagingCategoryInput,
  type ImagingServiceInput,
  type CreateImagingRequestInput,
  type ChangeImagingStatusInput,
  type SaveImagingResultInput,
  type AddImagingFileInput,
} from "@/lib/validations/imaging";
import { IMAGING_CATALOG } from "@/lib/imaging/catalog";
import { isProcedureReserved } from "@/lib/procedures/catalog";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";
import type { ImagingStatusValue } from "@/lib/validations/imaging";

// ----------------------------------------------------------------------------
// Categories
// ----------------------------------------------------------------------------
export async function createImagingCategory(input: ImagingCategoryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const te = await getErrorT();
  const parsed = imagingCategorySchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const supabase = await createClient();
  const { error } = await supabase.from("imaging_categories").insert({
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
  revalidatePath("/imaging/services");
  return ok(undefined);
}

export async function deleteImagingCategory(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase.from("imaging_categories").delete().eq("id", id).eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/imaging/services");
  return ok(undefined);
}

// ----------------------------------------------------------------------------
// Catalog services
// ----------------------------------------------------------------------------
export async function createImagingService(input: ImagingServiceInput): Promise<ActionResult<{ id: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const te = await getErrorT();
  const parsed = imagingServiceSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;
  // Classification guard: a procedure (Injection, Vaccine, Dressing, …) can never
  // be filed as an imaging study.
  if (isProcedureReserved(v.name)) return fail(te("imaging.isProcedure"));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imaging_services")
    .insert({
      clinic_id: clinicId,
      category_id: v.categoryId || null,
      name: v.name,
      code: v.code || null,
      modality: v.modality || null,
      default_price: v.defaultPrice,
      description: v.description || null,
      is_active: v.isActive ?? true,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return fail("A study with that name already exists.");
    return fail(error?.message ?? te("imaging.createFailed"));
  }
  revalidatePath("/imaging/services");
  return ok({ id: data.id });
}

export async function updateImagingService(id: string, input: ImagingServiceInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const te = await getErrorT();
  const parsed = imagingServiceSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;
  if (isProcedureReserved(v.name)) return fail(te("imaging.isProcedure"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("imaging_services")
    .update({
      category_id: v.categoryId || null,
      name: v.name,
      code: v.code || null,
      modality: v.modality || null,
      default_price: v.defaultPrice,
      description: v.description || null,
      is_active: v.isActive ?? true,
    })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/imaging/services");
  return ok(undefined);
}

export async function deleteImagingService(id: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("imaging_services")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/imaging/services");
  return ok(undefined);
}

/** Seeds the standard imaging catalog (categories + services). Idempotent. */
export async function seedImagingCatalog(): Promise<ActionResult<{ created: number }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const supabase = await createClient();

  const [{ data: cats }, { data: svcs }] = await Promise.all([
    supabase.from("imaging_categories").select("id, name"),
    supabase.from("imaging_services").select("name"),
  ]);
  const catByName = new Map((cats ?? []).map((c) => [c.name, c.id]));
  const haveService = new Set((svcs ?? []).map((s) => s.name));
  let created = 0;

  for (const group of IMAGING_CATALOG) {
    let categoryId = catByName.get(group.title);
    if (!categoryId) {
      const { data } = await supabase
        .from("imaging_categories")
        .insert({ clinic_id: clinicId, name: group.title, created_by: user.id })
        .select("id")
        .single();
      if (data) {
        categoryId = data.id;
        catByName.set(group.title, categoryId);
        created++;
      }
    }
    const missing = group.services.filter((s) => !haveService.has(s.name));
    if (missing.length > 0) {
      const { data } = await supabase
        .from("imaging_services")
        .insert(
          missing.map((s) => ({
            clinic_id: clinicId,
            category_id: categoryId ?? null,
            name: s.name,
            modality: s.modality,
            created_by: user.id,
          }))
        )
        .select("name");
      created += data?.length ?? 0;
      for (const s of data ?? []) haveService.add(s.name);
    }
  }
  revalidatePath("/imaging/services");
  return ok({ created });
}

// ----------------------------------------------------------------------------
// Requests
// ----------------------------------------------------------------------------
export async function createImagingRequest(
  input: CreateImagingRequestInput
): Promise<ActionResult<{ requestIds: string[] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const te = await getErrorT();
  const parsed = createImagingRequestSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;
  const names = Array.from(new Set(v.serviceNames));

  const supabase = await createClient();

  // Resolve each study to its catalog row (for category + modality snapshot).
  const { data: services } = await supabase
    .from("imaging_services")
    .select("id, name, category_id, modality")
    .in("name", names)
    .is("deleted_at", null);
  const svcByName = new Map((services ?? []).map((s) => [s.name, s]));

  const visitId = await resolveOpenVisitId(supabase, v.patientId);
  const { data, error } = await supabase
    .from("imaging_requests")
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
          service_id: svc?.id ?? null,
          service_name: name,
          modality: svc?.modality ?? null,
          notes: v.notes || null,
          created_by: user.id,
        };
      })
    )
    .select("id");
  if (error || !data || data.length === 0) return fail(error?.message ?? te("imaging.createFailed"));

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "imaging",
    title: names.length === 1 ? "Imaging requested" : `${names.length} imaging studies requested`,
    description: names.join(", "),
    created_by: user.id,
  });

  revalidatePath("/imaging");
  revalidatePath(`/patients/${v.patientId}`);
  return ok({ requestIds: data.map((r) => r.id) });
}

/** Status timestamps stamped as a request advances through its lifecycle. */
const STAMP: Record<ImagingStatusValue, Record<string, string | null>> = {
  requested: { scheduled_at: null, performed_at: null, reported_at: null },
  scheduled: { scheduled_at: new Date().toISOString() },
  performed: { performed_at: new Date().toISOString() },
  reported: { reported_at: new Date().toISOString() },
  cancelled: {},
};

export async function changeImagingStatus(input: ChangeImagingStatusInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const parsed = changeImagingStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { requestId, status } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("imaging_requests")
    .update({ status, ...STAMP[status] })
    .eq("id", requestId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/imaging", "layout");
  return ok(undefined);
}

/** Saves (upserts) the clinical result; advances the request to 'reported'. */
export async function saveImagingResult(input: SaveImagingResultInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const te = await getErrorT();
  const parsed = saveImagingResultSchema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("imaging_results")
    .select("id")
    .eq("imaging_request_id", v.requestId)
    .limit(1)
    .maybeSingle();

  const payload = {
    findings: v.findings || null,
    impression: v.impression || null,
    report_text: v.reportText || null,
  };
  if (existing) {
    const { error } = await supabase.from("imaging_results").update(payload).eq("id", existing.id).eq("clinic_id", clinicId);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase
      .from("imaging_results")
      .insert({ clinic_id: clinicId, imaging_request_id: v.requestId, created_by: user.id, ...payload });
    if (error) return fail(error.message);
  }

  // Reporting a result completes the request's clinical lifecycle.
  await supabase
    .from("imaging_requests")
    .update({ status: "reported", reported_at: new Date().toISOString() })
    .eq("id", v.requestId)
    .eq("clinic_id", clinicId)
    .neq("status", "cancelled");

  revalidatePath("/imaging", "layout");
  return ok(undefined);
}

export async function addImagingFile(input: AddImagingFileInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const parsed = addImagingFileSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  if (!v.filePath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  const { error } = await supabase.from("imaging_files").insert({
    clinic_id: clinicId,
    imaging_request_id: v.requestId,
    file_path: v.filePath,
    file_name: v.fileName || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);
  revalidatePath("/imaging", "layout");
  return ok(undefined);
}

export async function deleteImagingRequest(requestId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.IMAGING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("imaging_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath("/imaging");
  return ok(undefined);
}
