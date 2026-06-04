"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createInvoiceSchema,
  editInvoiceSchema,
  recordPaymentSchema,
  refundPaymentSchema,
  billFromSourcesSchema,
  type CreateInvoiceInput,
  type EditInvoiceInput,
  type RecordPaymentInput,
  type RefundPaymentInput,
  type BillFromSourcesInput,
} from "@/lib/validations/invoice";
import { ok, fail, type ActionResult } from "./types";

function revalidateBilling(invoiceId?: string) {
  revalidatePath("/billing");
  revalidatePath("/billing/invoices");
  revalidatePath("/billing/payments");
  if (invoiceId) revalidatePath(`/billing/${invoiceId}`);
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<ActionResult<{ invoiceId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      clinic_id: clinicId,
      patient_id: v.patientId || null,
      branch_id: v.branchId || null,
      doctor_id: v.doctorId || null,
      service_type: v.serviceType || null,
      due_date: v.dueDate || null,
      status: v.asDraft ? "draft" : "unpaid",
      discount: v.discount,
      tax: v.tax,
      notes: v.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !invoice) return fail(error?.message ?? "Could not create invoice.");

  const items = v.items.map((it, i) => ({
    clinic_id: clinicId,
    invoice_id: invoice.id,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    sort_order: i,
  }));
  const { error: itemsErr } = await supabase.from("invoice_items").insert(items);
  if (itemsErr) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return fail(itemsErr.message);
  }

  if (v.patientId) {
    await supabase.from("patient_timeline").insert({
      clinic_id: clinicId,
      patient_id: v.patientId,
      event_type: "invoice",
      title: v.asDraft ? "Draft invoice created" : "Invoice created",
      created_by: user.id,
    });
  }

  revalidateBilling();
  return ok({ invoiceId: invoice.id });
}

/**
 * Edits an invoice's line items and fields. Only allowed while no payment has
 * been recorded (draft/unpaid), so issued+paid history stays immutable.
 */
export async function editInvoice(invoiceId: string, input: EditInvoiceInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = editInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("status, amount_paid")
    .eq("id", invoiceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!inv) return fail("Invoice not found.");
  if (inv.status === "cancelled") return fail("This invoice is cancelled.");
  if (Number(inv.amount_paid) > 0) return fail("Cannot edit an invoice that already has payments.");

  const { error: upErr } = await supabase
    .from("invoices")
    .update({
      patient_id: v.patientId || null,
      branch_id: v.branchId || null,
      doctor_id: v.doctorId || null,
      service_type: v.serviceType || null,
      due_date: v.dueDate || null,
      discount: v.discount,
      tax: v.tax,
      notes: v.notes || null,
    })
    .eq("id", invoiceId)
    .eq("clinic_id", clinicId);
  if (upErr) return fail(upErr.message);

  // Replace line items wholesale (triggers recompute the subtotal/total).
  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId).eq("clinic_id", clinicId);
  const items = v.items.map((it, i) => ({
    clinic_id: clinicId,
    invoice_id: invoiceId,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    sort_order: i,
  }));
  const { error: itemsErr } = await supabase.from("invoice_items").insert(items);
  if (itemsErr) return fail(itemsErr.message);

  revalidateBilling(invoiceId);
  return ok(undefined);
}

/** Duplicates an invoice (and its line items) as a new draft. */
export async function duplicateInvoice(invoiceId: string): Promise<ActionResult<{ invoiceId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();

  const { data: src } = await supabase
    .from("invoices")
    .select("patient_id, branch_id, doctor_id, service_type, discount, tax, notes")
    .eq("id", invoiceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!src) return fail("Invoice not found.");

  const { data: srcItems } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, sort_order")
    .eq("invoice_id", invoiceId)
    .eq("clinic_id", clinicId);

  const { data: copy, error } = await supabase
    .from("invoices")
    .insert({
      clinic_id: clinicId,
      patient_id: src.patient_id,
      branch_id: src.branch_id,
      doctor_id: src.doctor_id,
      service_type: src.service_type,
      status: "draft",
      discount: src.discount,
      tax: src.tax,
      notes: src.notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !copy) return fail(error?.message ?? "Could not duplicate invoice.");

  if (srcItems && srcItems.length > 0) {
    await supabase.from("invoice_items").insert(
      srcItems.map((it) => ({
        clinic_id: clinicId,
        invoice_id: copy.id,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        sort_order: it.sort_order,
      }))
    );
  }

  revalidateBilling();
  return ok({ invoiceId: copy.id });
}

/** Issues a draft invoice (draft → unpaid). */
export async function finalizeInvoice(invoiceId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "unpaid", issued_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("clinic_id", clinicId)
    .eq("status", "draft");
  if (error) return fail(error.message);
  revalidateBilling(invoiceId);
  return ok(undefined);
}

/**
 * Smart billing: turns selected unbilled sources (completed appointments, lab
 * requests) into a single draft invoice and links each source so it can never
 * be billed again. Consultation fees come from the doctor; lab lines are priced
 * from the service catalog when a name matches, else left at 0 for review.
 */
export async function createInvoiceFromSources(
  input: BillFromSourcesInput
): Promise<ActionResult<{ invoiceId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = billFromSourcesSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.flatten().formErrors[0] ?? "Invalid selection.");
  }
  const v = parsed.data;
  const supabase = await createClient();

  // Drop anything already billed (dedupe guard before we build the invoice).
  const { data: links } = await supabase
    .from("invoice_source_links")
    .select("source, source_id")
    .in("source", ["appointment", "lab"]);
  const billed = new Set((links ?? []).map((l) => `${l.source}:${l.source_id}`));
  const apptIds = v.appointmentIds.filter((id) => !billed.has(`appointment:${id}`));
  const labIds = v.labIds.filter((id) => !billed.has(`lab:${id}`));
  if (apptIds.length + labIds.length === 0) return fail("Those charges are already billed.");

  type Item = { description: string; quantity: number; unit_price: number };
  const items: Item[] = [];

  if (apptIds.length > 0) {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, doctors ( full_name, consultation_fee )")
      .eq("patient_id", v.patientId)
      .eq("status", "completed")
      .in("id", apptIds);
    for (const a of (appts ?? []) as unknown as { doctors: { full_name: string; consultation_fee: number | null } | null }[]) {
      items.push({
        description: a.doctors?.full_name ? `Consultation — ${a.doctors.full_name}` : "Consultation",
        quantity: 1,
        unit_price: Number(a.doctors?.consultation_fee ?? 0),
      });
    }
  }

  if (labIds.length > 0) {
    const [{ data: labs }, { data: prices }] = await Promise.all([
      supabase.from("lab_requests").select("test_name").eq("patient_id", v.patientId).in("id", labIds),
      supabase.from("service_prices").select("name, unit_price").eq("category", "lab").is("archived_at", null),
    ]);
    const priceByName = new Map((prices ?? []).map((p) => [p.name.toLowerCase(), Number(p.unit_price)]));
    for (const l of labs ?? []) {
      items.push({
        description: l.test_name,
        quantity: 1,
        unit_price: priceByName.get(l.test_name.toLowerCase()) ?? 0,
      });
    }
  }

  if (items.length === 0) return fail("Nothing to bill.");

  const dominant = apptIds.length > 0 ? "appointment" : "lab";
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      clinic_id: clinicId,
      patient_id: v.patientId,
      source: dominant,
      service_type: apptIds.length > 0 && labIds.length > 0 ? "Visit" : dominant === "appointment" ? "Consultation" : "Laboratory",
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !invoice) return fail(error?.message ?? "Could not create invoice.");

  const { error: itemsErr } = await supabase.from("invoice_items").insert(
    items.map((it, i) => ({
      clinic_id: clinicId,
      invoice_id: invoice.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      sort_order: i,
    }))
  );
  if (itemsErr) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return fail(itemsErr.message);
  }

  // Link each source so it is never billed again (ignore races on the unique key).
  const linkRows = [
    ...apptIds.map((id) => ({ clinic_id: clinicId, invoice_id: invoice.id, source: "appointment" as const, source_id: id })),
    ...labIds.map((id) => ({ clinic_id: clinicId, invoice_id: invoice.id, source: "lab" as const, source_id: id })),
  ];
  await supabase.from("invoice_source_links").upsert(linkRows, { onConflict: "clinic_id,source,source_id", ignoreDuplicates: true });

  revalidateBilling();
  revalidatePath(`/patients/${v.patientId}`);
  return ok({ invoiceId: invoice.id });
}

/** Bulk-voids invoices (skips ones already paid). Used by the invoice table. */
export async function voidInvoices(invoiceIds: string[]): Promise<ActionResult<{ voided: number }>> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  if (invoiceIds.length === 0) return ok({ voided: 0 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "cancelled", voided_at: new Date().toISOString() })
    .in("id", invoiceIds)
    .eq("clinic_id", clinicId)
    .neq("status", "paid")
    .select("id");
  if (error) return fail(error.message);
  revalidateBilling();
  return ok({ voided: data?.length ?? 0 });
}

/** Records a payment against an invoice. Triggers recompute the balance/status. */
export async function recordPayment(input: RecordPaymentInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("balance, status")
    .eq("id", v.invoiceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!invoice) return fail("Invoice not found.");
  if (invoice.status === "cancelled") return fail("This invoice is cancelled.");
  if (invoice.status === "draft") return fail("Finalize the draft before taking payment.");
  if (v.amount > Number(invoice.balance) + 0.001) {
    return fail(`Amount exceeds the outstanding balance (${invoice.balance}).`);
  }

  const { error } = await supabase.from("payments").insert({
    clinic_id: clinicId,
    invoice_id: v.invoiceId,
    amount: v.amount,
    method: v.method,
    reference: v.reference || null,
    note: v.note || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  revalidateBilling(v.invoiceId);
  return ok(undefined);
}

/**
 * Records a refund against an invoice (a negative-effect payment row). Capped at
 * the net amount paid. When the invoice is fully refunded its status is set to
 * 'refunded'; otherwise the totals trigger reverts it to unpaid/partially_paid.
 */
export async function refundPayment(input: RefundPaymentInput): Promise<ActionResult> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = refundPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("amount_paid, status")
    .eq("id", v.invoiceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!invoice) return fail("Invoice not found.");
  if (invoice.status === "cancelled") return fail("This invoice is cancelled.");
  if (v.amount > Number(invoice.amount_paid) + 0.001) {
    return fail(`Refund exceeds the amount paid (${invoice.amount_paid}).`);
  }

  const { error } = await supabase.from("payments").insert({
    clinic_id: clinicId,
    invoice_id: v.invoiceId,
    amount: v.amount,
    method: v.method,
    kind: "refund",
    reference: v.reference || null,
    note: v.note || null,
    created_by: user.id,
  });
  if (error) return fail(error.message);

  // Mark fully-refunded invoices explicitly (the totals trigger only manages the
  // unpaid/partial/paid trio).
  const { data: after } = await supabase
    .from("invoices")
    .select("amount_paid, refunded_total")
    .eq("id", v.invoiceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (after && Number(after.refunded_total) > 0 && Number(after.amount_paid) <= 0.001) {
    await supabase.from("invoices").update({ status: "refunded" }).eq("id", v.invoiceId).eq("clinic_id", clinicId);
  }

  revalidateBilling(v.invoiceId);
  return ok(undefined);
}

/** Cancels (voids) an invoice. Soft state change keeps the record for audit. */
export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled", voided_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidateBilling(invoiceId);
  return ok(undefined);
}
