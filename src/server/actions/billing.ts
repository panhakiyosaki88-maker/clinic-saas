"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createInvoiceSchema,
  recordPaymentSchema,
  type CreateInvoiceInput,
  type RecordPaymentInput,
} from "@/lib/validations/invoice";
import { ok, fail, type ActionResult } from "./types";

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
      title: "Invoice created",
      created_by: user.id,
    });
  }

  revalidatePath("/billing");
  revalidatePath("/billing/invoices");
  return ok({ invoiceId: invoice.id });
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

  revalidatePath(`/billing/${v.invoiceId}`);
  revalidatePath("/billing");
  revalidatePath("/billing/invoices");
  return ok(undefined);
}

/** Cancels (voids) an invoice. Soft delete keeps the record for audit. */
export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", invoiceId)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);

  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
  revalidatePath("/billing/invoices");
  return ok(undefined);
}
