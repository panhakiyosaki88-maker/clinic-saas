"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createCategorySchema,
  createLabRequestSchema,
  changeLabStatusSchema,
  addLabResultSchema,
  type CreateCategoryInput,
  type CreateLabRequestInput,
  type ChangeLabStatusInput,
  type AddLabResultInput,
} from "@/lib/validations/lab";
import { ok, fail, type ActionResult } from "./types";

export async function createLabCategory(input: CreateCategoryInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.LAB_WRITE);
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("lab_categories").insert({
    clinic_id: clinicId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return fail("A category with that name already exists.");
    return fail(error.message);
  }
  revalidatePath("/lab/categories");
  return ok(undefined);
}

export async function createLabRequest(
  input: CreateLabRequestInput
): Promise<ActionResult<{ requestIds: string[] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.LAB_WRITE);
  const parsed = createLabRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  // De-duplicate ticked tests; one lab_request row per test so each can be
  // tracked and resulted independently.
  const testNames = Array.from(new Set(v.testNames));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_requests")
    .insert(
      testNames.map((testName) => ({
        clinic_id: clinicId,
        patient_id: v.patientId,
        doctor_id: v.doctorId || null,
        category_id: v.categoryId || null,
        test_name: testName,
        notes: v.notes || null,
        created_by: user.id,
      }))
    )
    .select("id");
  if (error || !data || data.length === 0) {
    return fail(error?.message ?? "Could not create lab request.");
  }

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "lab",
    title: testNames.length === 1 ? "Lab requested" : `${testNames.length} labs requested`,
    description: testNames.join(", "),
    created_by: user.id,
  });

  revalidatePath("/lab");
  revalidatePath(`/patients/${v.patientId}`);
  return ok({ requestIds: data.map((r) => r.id) });
}

export async function changeLabStatus(input: ChangeLabStatusInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.LAB_WRITE);
  const parsed = changeLabStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { requestId, status } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("lab_requests")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/lab/${requestId}`);
  revalidatePath("/lab");
  return ok(undefined);
}

/** Records a result (values and/or an uploaded report file path). */
export async function addLabResult(input: AddLabResultInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.LAB_WRITE);
  const parsed = addLabResultSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  if (v.filePath && !v.filePath.startsWith(`${clinicId}/`)) return fail("Invalid file path.");

  const supabase = await createClient();
  const { error } = await supabase.from("lab_results").insert({
    clinic_id: clinicId,
    lab_request_id: v.requestId,
    result_value: v.resultValue || null,
    unit: v.unit || null,
    reference_range: v.referenceRange || null,
    result_text: v.resultText || null,
    file_path: v.filePath || null,
    file_name: v.fileName || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/lab/${v.requestId}`);
  return ok(undefined);
}

export async function deleteLabRequest(requestId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.LAB_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("lab_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/lab");
  return ok(undefined);
}
