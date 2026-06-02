"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { sendEmail, type SendResult } from "@/lib/notifications/send";
import { ok, fail, type ActionResult } from "./types";
import type { NotificationType } from "@/types/database";

interface LogArgs {
  clinicId: string;
  userId: string;
  type: NotificationType;
  recipient: string;
  subject: string;
  body: string;
  result: SendResult;
  patientId?: string | null;
  appointmentId?: string | null;
  invoiceId?: string | null;
}

/** Records the outcome in the notifications log (audit trail). */
async function logNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: LogArgs
) {
  await supabase.from("notifications").insert({
    clinic_id: args.clinicId,
    channel: "email",
    type: args.type,
    recipient: args.recipient || "(no email)",
    subject: args.subject,
    body: args.body,
    status: args.result.status,
    error: args.result.error ?? null,
    patient_id: args.patientId ?? null,
    appointment_id: args.appointmentId ?? null,
    invoice_id: args.invoiceId ?? null,
    sent_at: args.result.status === "sent" ? new Date().toISOString() : null,
    created_by: args.userId,
  });
}

export async function sendAppointmentReminder(
  appointmentId: string
): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const parsed = z.string().uuid().safeParse(appointmentId);
  if (!parsed.success) return fail("Invalid appointment.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, scheduled_at, patient_id, patients ( full_name, email )")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!data) return fail("Appointment not found.");

  const patient = (data as unknown as { patients: { full_name: string; email: string | null } | null }).patients;
  const to = patient?.email ?? "";
  const when = new Date(data.scheduled_at).toLocaleString();
  const subject = "Appointment reminder";
  const html = `<p>Dear ${patient?.full_name ?? "patient"},</p><p>This is a reminder of your appointment on <strong>${when}</strong>.</p><p>Thank you.</p>`;

  const result: SendResult = to
    ? await sendEmail({ to, subject, html })
    : { status: "skipped", error: "Patient has no email" };

  await logNotification(supabase, {
    clinicId, userId: user.id, type: "appointment_reminder",
    recipient: to, subject, body: html, result,
    patientId: data.patient_id, appointmentId: data.id,
  });

  revalidatePath("/notifications");
  return ok({ status: result.status });
}

export async function sendPaymentReminder(
  invoiceId: string
): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const parsed = z.string().uuid().safeParse(invoiceId);
  if (!parsed.success) return fail("Invalid invoice.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, balance, patient_id, patients ( full_name, email )")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!data) return fail("Invoice not found.");

  const patient = (data as unknown as { patients: { full_name: string; email: string | null } | null }).patients;
  const to = patient?.email ?? "";
  const subject = `Payment reminder — invoice ${data.invoice_number}`;
  const html = `<p>Dear ${patient?.full_name ?? "patient"},</p><p>Our records show an outstanding balance of <strong>${Number(data.balance).toFixed(2)}</strong> on invoice ${data.invoice_number}.</p><p>Thank you.</p>`;

  const result: SendResult = to
    ? await sendEmail({ to, subject, html })
    : { status: "skipped", error: "Patient has no email" };

  await logNotification(supabase, {
    clinicId, userId: user.id, type: "payment_reminder",
    recipient: to, subject, body: html, result,
    patientId: data.patient_id, invoiceId: data.id,
  });

  revalidatePath("/notifications");
  return ok({ status: result.status });
}

const followUpSchema = z.object({
  patientId: z.string().uuid(),
  message: z.string().trim().min(1, "Enter a message").max(2000),
});

export async function sendFollowUp(input: { patientId: string; message: string }): Promise<ActionResult<{ status: SendResult["status"] }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email")
    .eq("id", parsed.data.patientId)
    .maybeSingle();
  if (!patient) return fail("Patient not found.");

  const to = patient.email ?? "";
  const subject = "Follow-up from your clinic";
  const html = `<p>Dear ${patient.full_name},</p><p>${parsed.data.message}</p>`;

  const result: SendResult = to
    ? await sendEmail({ to, subject, html })
    : { status: "skipped", error: "Patient has no email" };

  await logNotification(supabase, {
    clinicId, userId: user.id, type: "follow_up",
    recipient: to, subject, body: html, result, patientId: patient.id,
  });

  revalidatePath("/notifications");
  return ok({ status: result.status });
}
