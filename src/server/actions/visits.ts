"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveOpenVisitId } from "@/lib/db/open-visit";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createVisitSchema,
  closeVisitSchema,
  dispenseSchema,
  recordProcedureSchema,
  type CreateVisitInput,
  type CloseVisitInput,
  type DispenseInput,
  type RecordProcedureInput,
} from "@/lib/validations/visit";
import { ok, fail, type ActionResult } from "./types";

/** Opens a visit (encounter) for a patient. Front desk / clinical staff. */
export async function createVisit(input: CreateVisitInput): Promise<ActionResult<{ visitId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const parsed = createVisitSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_visits")
    .insert({
      clinic_id: clinicId,
      patient_id: v.patientId,
      branch_id: v.branchId || null,
      doctor_id: v.doctorId || null,
      appointment_id: v.appointmentId || null,
      chief_complaint: v.chiefComplaint || null,
      notes: v.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Could not create visit.");

  // Attach the originating appointment to this visit when given.
  if (v.appointmentId) {
    await supabase.from("appointments").update({ visit_id: data.id }).eq("id", v.appointmentId).eq("clinic_id", clinicId);
  }

  revalidatePath(`/patients/${v.patientId}`);
  revalidatePath(`/visits/${data.id}`);
  return ok({ visitId: data.id });
}

export async function closeVisit(input: CloseVisitInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const parsed = closeVisitSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid visit.");

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("patient_visits")
    .update({ status: "closed", closed_at: now })
    .eq("id", parsed.data.visitId)
    .eq("clinic_id", clinicId)
    .select("patient_id")
    .maybeSingle();
  if (error) return fail(error.message);

  // Closing the encounter completes its appointment (the mirror of completing an
  // appointment, which closes its visit). Only active appointments transition.
  await supabase
    .from("appointments")
    .update({ status: "completed", completed_at: now })
    .eq("clinic_id", clinicId)
    .eq("visit_id", parsed.data.visitId)
    .neq("status", "completed")
    .neq("status", "cancelled");

  revalidatePath(`/visits/${parsed.data.visitId}`);
  revalidatePath("/appointments");
  if (data?.patient_id) revalidatePath(`/patients/${data.patient_id}`);
  return ok(undefined);
}

/** Reopens a closed visit so further charges/records can be threaded to it. */
export async function reopenVisit(input: CloseVisitInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const parsed = closeVisitSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid visit.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_visits")
    .update({ status: "open", closed_at: null })
    .eq("id", parsed.data.visitId)
    .eq("clinic_id", clinicId)
    .select("patient_id")
    .maybeSingle();
  if (error) return fail(error.message);

  // Reopening puts a completed appointment back into consultation (the inverse of
  // closing → completing it).
  await supabase
    .from("appointments")
    .update({ status: "in_consultation", completed_at: null })
    .eq("clinic_id", clinicId)
    .eq("visit_id", parsed.data.visitId)
    .eq("status", "completed");

  revalidatePath(`/visits/${parsed.data.visitId}`);
  revalidatePath("/appointments");
  if (data?.patient_id) revalidatePath(`/patients/${data.patient_id}`);
  return ok(undefined);
}

/**
 * Dispenses medicine to a patient: records a negative stock-ledger entry (the
 * trigger updates stock) carrying patient_id/visit_id + a unit_price snapshot,
 * so it becomes a billable pharmacy sale the workspace detects.
 */
export async function recordDispense(input: DispenseInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.PHARMACY_WRITE);
  const parsed = dispenseSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: med } = await supabase
    .from("medicines")
    .select("stock_quantity, selling_price")
    .eq("id", v.medicineId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!med) return fail("Medicine not found.");
  if (med.stock_quantity - v.quantity < 0) return fail(`Only ${med.stock_quantity} in stock.`);

  const unitPrice = v.unitPrice ?? Number(med.selling_price ?? 0);
  const visitId = v.visitId || (await resolveOpenVisitId(supabase, v.patientId));
  const { error } = await supabase.from("inventory_transactions").insert({
    clinic_id: clinicId,
    medicine_id: v.medicineId,
    branch_id: v.branchId || null,
    patient_id: v.patientId,
    visit_id: visitId,
    change: -v.quantity,
    reason: "dispense",
    unit_price: unitPrice,
    note: v.note || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath("/pharmacy");
  revalidatePath(`/pharmacy/${v.medicineId}`);
  revalidatePath(`/patients/${v.patientId}`);
  if (visitId) revalidatePath(`/visits/${visitId}`);
  return ok(undefined);
}

/** Records a procedure performed in a visit (snapshots name + price → billable). */
export async function recordProcedure(input: RecordProcedureInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.EMR_WRITE);
  const parsed = recordProcedureSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const visitId = v.visitId || (await resolveOpenVisitId(supabase, v.patientId));
  const { error } = await supabase.from("visit_procedures").insert({
    clinic_id: clinicId,
    visit_id: visitId,
    patient_id: v.patientId,
    procedure_id: v.procedureId || null,
    doctor_id: v.doctorId || null,
    name: v.name,
    price: v.price,
    quantity: v.quantity,
    notes: v.notes || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidatePath(`/patients/${v.patientId}`);
  if (visitId) revalidatePath(`/visits/${visitId}`);
  return ok(undefined);
}
