"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createPrescriptionSchema,
  type CreatePrescriptionInput,
} from "@/lib/validations/prescription";
import { ok, fail, type ActionResult } from "./types";

export async function createPrescription(
  input: CreatePrescriptionInput
): Promise<ActionResult<{ prescriptionId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PRESCRIPTIONS_WRITE);
  const parsed = createPrescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: rx, error } = await supabase
    .from("prescriptions")
    .insert({
      clinic_id: clinicId,
      patient_id: v.patientId,
      doctor_id: v.doctorId || null,
      medical_record_id: v.medicalRecordId || null,
      notes: v.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !rx) return fail(error?.message ?? "Could not create prescription.");

  const items = v.items.map((it, i) => ({
    clinic_id: clinicId,
    prescription_id: rx.id,
    medicine_name: it.medicineName,
    dosage: it.dosage || null,
    frequency: it.frequency || null,
    duration: it.duration || null,
    instructions: it.instructions || null,
    quantity: it.quantity ?? null,
    sort_order: i,
  }));
  const { error: itemsErr } = await supabase.from("prescription_items").insert(items);
  if (itemsErr) {
    // Roll back the header so we don't leave an empty prescription.
    await supabase.from("prescriptions").delete().eq("id", rx.id);
    return fail(itemsErr.message);
  }

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "prescription",
    title: "Prescription issued",
    description: `${items.length} item${items.length > 1 ? "s" : ""}`,
    created_by: user.id,
  });

  revalidatePath("/prescriptions");
  revalidatePath(`/patients/${v.patientId}`);
  return ok({ prescriptionId: rx.id });
}

/** Soft delete (void) — clinical records are retained. */
export async function deletePrescription(
  prescriptionId: string,
  patientId: string
): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.PRESCRIPTIONS_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("prescriptions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", prescriptionId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath("/prescriptions");
  revalidatePath(`/patients/${patientId}`);
  return ok(undefined);
}
