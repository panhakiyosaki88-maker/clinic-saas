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
  billFromVisitSchema,
  unbillChargeSchema,
  type CreateInvoiceInput,
  type EditInvoiceInput,
  type RecordPaymentInput,
  type RefundPaymentInput,
  type BillFromVisitInput,
  type UnbillChargeInput,
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
    category: it.category,
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
    category: it.category,
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
    .select("description, quantity, unit_price, category, sort_order")
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
        category: it.category,
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
 * Billing Workspace / Suggested charges → invoice. Takes the reviewed,
 * category-tagged lines for a patient/visit (detected charges plus any manual
 * ones, with edits/overrides already applied) and writes one invoice:
 * category-tagged line items + a source link per detected line so each charge is
 * billed at most once. When `invoiceId` is given it edits that existing draft in
 * place (replacing items + links) so the Workspace continues a draft started in
 * Suggested charges instead of duplicating it; otherwise it creates a new
 * invoice. The passed discount already folds in any membership benefit. Drops any
 * line whose source is already billed on another invoice (dedupe guard).
 */
export async function createInvoiceFromVisit(
  input: BillFromVisitInput
): Promise<ActionResult<{ invoiceId: string }>> {
  const { clinicId, user } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = billFromVisitSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.flatten().formErrors[0] ?? "Please fix the highlighted fields.");
  }
  const v = parsed.data;
  const supabase = await createClient();

  // All source ids a line touches (primary + any bundled ids, e.g. a single
  // "Laboratory Test" line that covers many lab requests).
  const lineSourceIds = (l: (typeof v.lines)[number]): string[] =>
    l.source === "manual" ? [] : [l.sourceId ?? "", ...(l.linkSourceIds ?? [])].filter(Boolean);

  // Dedupe: drop detected lines whose source(s) are already linked to *another*
  // invoice (when editing a draft, its own links don't count — they're rewritten).
  const editingId = v.invoiceId || null;
  const sourcedTypes = [...new Set(v.lines.filter((l) => lineSourceIds(l).length > 0).map((l) => l.source))];
  let billed = new Set<string>();
  if (sourcedTypes.length > 0) {
    const { data: links } = await supabase
      .from("invoice_source_links")
      .select("source, source_id, invoice_id, invoices ( status )")
      .in("source", sourcedTypes);
    // A link to a cancelled invoice no longer counts — that charge is free again.
    billed = new Set(
      ((links ?? []) as unknown as { source: string; source_id: string; invoice_id: string; invoices: { status: string } | null }[])
        .filter((l) => l.invoice_id !== editingId && l.invoices && l.invoices.status !== "cancelled")
        .map((l) => `${l.source}:${l.source_id}`)
    );
  }
  // Keep a line if it is manual, has no source, or still has at least one
  // un-billed source id.
  const lines = v.lines.filter((l) => {
    const ids = lineSourceIds(l);
    return ids.length === 0 || ids.some((id) => !billed.has(`${l.source}:${id}`));
  });
  if (lines.length === 0) return fail("Those charges are already billed.");

  // Build line item + source-link rows for a given invoice id.
  const itemRows = (invoiceId: string) =>
    lines.map((l, i) => ({
      clinic_id: clinicId,
      invoice_id: invoiceId,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      category: l.category,
      sort_order: i,
    }));
  // Link every source each line touches (primary + bundled) so none can be
  // billed again. Skip ids already billed elsewhere (race guard).
  const linkRows = (invoiceId: string) =>
    lines.flatMap((l) =>
      lineSourceIds(l)
        .filter((id) => !billed.has(`${l.source}:${id}`))
        .map((id) => ({ clinic_id: clinicId, invoice_id: invoiceId, source: l.source, source_id: id }))
    );

  // --- Edit an existing draft (Workspace continuing a Suggested-charges draft) ---
  if (editingId) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("status, amount_paid")
      .eq("id", editingId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (!inv) return fail("Invoice not found.");
    if (inv.status === "cancelled") return fail("This invoice is cancelled.");
    if (Number(inv.amount_paid) > 0) return fail("Cannot edit an invoice that already has payments.");

    // Replace items + this invoice's source links wholesale (triggers recompute totals).
    await supabase.from("invoice_items").delete().eq("invoice_id", editingId).eq("clinic_id", clinicId);
    const { error: itemsErr } = await supabase.from("invoice_items").insert(itemRows(editingId));
    if (itemsErr) return fail(itemsErr.message);

    await supabase.from("invoice_source_links").delete().eq("invoice_id", editingId).eq("clinic_id", clinicId);
    const links = linkRows(editingId);
    if (links.length > 0) {
      await supabase.from("invoice_source_links").upsert(links, { onConflict: "clinic_id,source,source_id" });
    }

    await supabase
      .from("invoices")
      .update({
        discount: v.discount,
        tax: v.tax,
        notes: v.notes || null,
        ...(v.asDraft
          ? { status: "draft" }
          : inv.status === "draft"
            ? { status: "unpaid", issued_at: new Date().toISOString() }
            : {}),
      })
      .eq("id", editingId)
      .eq("clinic_id", clinicId);

    revalidateBilling(editingId);
    revalidatePath(`/patients/${v.patientId}`);
    if (v.visitId) revalidatePath(`/visits/${v.visitId}`);
    return ok({ invoiceId: editingId });
  }

  // --- Create a new invoice ---
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      clinic_id: clinicId,
      patient_id: v.patientId,
      visit_id: v.visitId || null,
      source: "visit",
      service_type: "Visit",
      status: v.asDraft ? "draft" : "unpaid",
      discount: v.discount,
      tax: v.tax,
      notes: v.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !invoice) return fail(error?.message ?? "Could not create invoice.");

  const { error: itemsErr } = await supabase.from("invoice_items").insert(itemRows(invoice.id));
  if (itemsErr) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return fail(itemsErr.message);
  }

  // On conflict, repoint the link to this invoice — covers a charge freed from a
  // now-cancelled invoice.
  const links = linkRows(invoice.id);
  if (links.length > 0) {
    await supabase
      .from("invoice_source_links")
      .upsert(links, { onConflict: "clinic_id,source,source_id" });
  }

  await supabase.from("patient_timeline").insert({
    clinic_id: clinicId,
    patient_id: v.patientId,
    event_type: "invoice",
    title: v.asDraft ? "Draft invoice created" : "Invoice created",
    description: `${lines.length} item${lines.length === 1 ? "" : "s"}`,
    created_by: user.id,
  });

  revalidateBilling();
  revalidatePath(`/patients/${v.patientId}`);
  if (v.visitId) revalidatePath(`/visits/${v.visitId}`);
  return ok({ invoiceId: invoice.id });
}

/**
 * Un-bills a single detected charge: unlinks it from its invoice and drops the
 * matching line item, so it reappears as a selectable charge in Suggested
 * charges (to be re-priced and re-billed). Only allowed while the invoice has no
 * payments. An emptied draft invoice is deleted.
 */
export async function unbillCharge(input: UnbillChargeInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const parsed = unbillChargeSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid charge.");
  const { source, sourceId, description } = parsed.data;
  const supabase = await createClient();

  // The invoice this charge is linked to.
  const { data: link } = await supabase
    .from("invoice_source_links")
    .select("invoice_id")
    .eq("clinic_id", clinicId)
    .eq("source", source)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (!link) return fail("This charge isn't billed.");

  const { data: inv } = await supabase
    .from("invoices")
    .select("id, patient_id, status, amount_paid")
    .eq("id", link.invoice_id)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!inv) return fail("Invoice not found.");
  if (inv.status === "cancelled") return fail("This invoice is cancelled.");
  if (Number(inv.amount_paid) > 0) return fail("Cannot edit an invoice that already has payments.");

  // Unlink the source so the charge becomes selectable again.
  await supabase
    .from("invoice_source_links")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("source", source)
    .eq("source_id", sourceId);

  // Drop one matching line item; the trigger recomputes the invoice totals.
  const { data: item } = await supabase
    .from("invoice_items")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("invoice_id", inv.id)
    .eq("description", description)
    .limit(1)
    .maybeSingle();
  if (item) {
    await supabase.from("invoice_items").delete().eq("id", item.id).eq("clinic_id", clinicId);
  }

  // Clean up an emptied draft invoice (and any leftover source links).
  const { count } = await supabase
    .from("invoice_items")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("invoice_id", inv.id);
  if ((count ?? 0) === 0) {
    await supabase.from("invoice_source_links").delete().eq("clinic_id", clinicId).eq("invoice_id", inv.id);
    await supabase.from("invoices").delete().eq("id", inv.id).eq("clinic_id", clinicId);
  }

  revalidateBilling(inv.id);
  if (inv.patient_id) revalidatePath(`/patients/${inv.patient_id}`);
  return ok(undefined);
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
    .select("id, patient_id");
  if (error) return fail(error.message);

  const voided = data ?? [];
  if (voided.length > 0) {
    // A voided invoice releases its charges so they can be billed again.
    await supabase
      .from("invoice_source_links")
      .delete()
      .eq("clinic_id", clinicId)
      .in("invoice_id", voided.map((v) => v.id));
    for (const v of voided) if (v.patient_id) revalidatePath(`/patients/${v.patient_id}`);
  }
  revalidateBilling();
  return ok({ voided: voided.length });
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
