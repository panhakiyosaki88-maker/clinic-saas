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
      branch_id: v.branchId || null,
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
    timing: it.timing || null,
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

  // Best-effort: register any newly prescribed medicines in the pharmacy
  // catalog so they're suggested next time. Needs pharmacy.write — silently
  // skipped for users without it, and never blocks the prescription.
  const names = Array.from(
    new Set(v.items.map((it) => it.medicineName.trim()).filter((n) => n.length > 0))
  );
  if (names.length > 0) {
    const { data: existing } = await supabase.from("medicines").select("name").is("deleted_at", null);
    const known = new Set((existing ?? []).map((m) => m.name.trim().toLowerCase()));
    const toAdd = names.filter((n) => !known.has(n.toLowerCase()));
    // Insert per-row so a unique-name conflict (race / edge case) only skips
    // that one medicine instead of dropping the whole batch.
    await Promise.all(
      toAdd.map((name) =>
        supabase.from("medicines").insert({ clinic_id: clinicId, name, created_by: user.id })
      )
    );
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
  revalidatePath("/pharmacy");
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
