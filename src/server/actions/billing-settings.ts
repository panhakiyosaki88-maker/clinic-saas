"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listBranches } from "@/lib/db/queries/clinic";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok, fail, type ActionResult } from "./types";
import { getErrorT, localizeFieldErrors } from "@/lib/i18n/action-errors";

const schema = z.object({
  branchId: z.string().uuid(),
  khqrMerchantName: z.string().trim().max(60).optional().or(z.literal("")),
  khqrMerchantAccount: z.string().trim().max(120).optional().or(z.literal("")),
  khqrMerchantCity: z.string().trim().max(60).optional().or(z.literal("")),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  usdToKhrRate: z.preprocess((v) => (v === "" || v == null ? 4100 : v), z.coerce.number().positive().max(100000).default(4100)),
  taxRate: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().min(0).max(100).default(0)),
  invoiceDueDays: z.preprocess((v) => (v === "" || v == null ? 14 : v), z.coerce.number().int().min(0).max(365).default(14)),
});
export type BillingSettingsInput = z.infer<typeof schema>;

export async function saveBillingSettings(input: BillingSettingsInput): Promise<ActionResult> {
  const { clinicId } = await requirePermission(PERMISSIONS.BILLING_WRITE);
  const te = await getErrorT();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
  const v = parsed.data;

  // Only accept a branch that belongs to the caller's clinic.
  const branches = await listBranches();
  if (!branches.some((b) => b.id === v.branchId)) return fail(te("branch.unknown"));

  const supabase = await createClient();
  const { error } = await supabase.from("billing_settings").upsert(
    {
      clinic_id: clinicId,
      branch_id: v.branchId,
      khqr_merchant_name: v.khqrMerchantName || null,
      khqr_merchant_account: v.khqrMerchantAccount || null,
      khqr_merchant_city: v.khqrMerchantCity || null,
      currency: v.currency,
      usd_to_khr_rate: v.usdToKhrRate,
      tax_rate: v.taxRate,
      invoice_due_days: v.invoiceDueDays,
    },
    { onConflict: "clinic_id,branch_id" }
  );
  if (error) return fail(error.message);
  revalidatePath("/settings/billing/payment");
  return ok(undefined);
}
