"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok, fail, type ActionResult } from "./types";

const schema = z.object({
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
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("billing_settings").upsert(
    {
      clinic_id: clinicId,
      khqr_merchant_name: v.khqrMerchantName || null,
      khqr_merchant_account: v.khqrMerchantAccount || null,
      khqr_merchant_city: v.khqrMerchantCity || null,
      currency: v.currency,
      usd_to_khr_rate: v.usdToKhrRate,
      tax_rate: v.taxRate,
      invoice_due_days: v.invoiceDueDays,
    },
    { onConflict: "clinic_id" }
  );
  if (error) return fail(error.message);
  revalidatePath("/billing/settings");
  return ok(undefined);
}
