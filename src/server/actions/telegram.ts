"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClinic } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { LinkKind } from "@/lib/notifications/telegram-link";
import { ok, fail, type ActionResult } from "./types";

/**
 * Detaches a Telegram chat from an account. Users may disconnect their own
 * profile; disconnecting a patient requires patients.write.
 */
export async function disconnectTelegram(kind: LinkKind, id: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (kind === "user") {
    const { user } = await requireClinic();
    if (id !== user.id) return fail("You can only disconnect your own Telegram.");
    const { error } = await supabase.from("profiles").update({ telegram_chat_id: null }).eq("id", user.id);
    if (error) return fail(error.message);
    revalidatePath("/settings/notifications");
    return ok(undefined);
  }

  // kind === "patient"
  const { clinicId } = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
  const { error } = await supabase
    .from("patients")
    .update({ telegram_chat_id: null })
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) return fail(error.message);
  revalidatePath(`/patients/${id}`);
  return ok(undefined);
}

/**
 * Registers (or re-points) the Telegram webhook to this deployment's
 * /api/telegram/webhook, with the secret token Telegram echoes back on each
 * call. Run once after configuring TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET.
 */
export async function setTelegramWebhook(): Promise<ActionResult<{ url: string }>> {
  await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!token) return fail("TELEGRAM_BOT_TOKEN is not set.");
  if (!secret) return fail("TELEGRAM_WEBHOOK_SECRET is not set.");
  if (!base) return fail("NEXT_PUBLIC_APP_URL is not set.");

  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"] }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) return fail(data.description ?? "Telegram rejected the webhook.");
    return ok({ url });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to reach Telegram.");
  }
}
