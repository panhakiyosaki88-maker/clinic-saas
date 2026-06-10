import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeSettings, type NotificationTemplate } from "@/lib/db/queries/notification-settings";
import { processClinicReminders, type ProcessResult } from "@/lib/notifications/reminders";
import { getTelegramConfig } from "@/lib/notifications/telegram-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Scheduled reminder sweep. Invoked by Vercel Cron (see vercel.json) with the
 * `Authorization: Bearer ${CRON_SECRET}` header. Uses the service-role client to
 * cross the clinic boundary, processing each clinic's due appointment & payment
 * reminders. Idempotent — already-sent reminders are skipped.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Require a matching secret. (If CRON_SECRET is unset we refuse, rather than
  // run unauthenticated.)
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: clinics, error } = await admin.from("clinics").select("id, name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totals: ProcessResult = { appointment: 0, payment: 0, doctor: 0, ownerSummary: 0 };
  let clinicsProcessed = 0;

  for (const clinic of clinics ?? []) {
    const [settingsRes, templatesRes] = await Promise.all([
      admin.from("notification_settings").select("*").eq("clinic_id", clinic.id).maybeSingle(),
      admin.from("notification_templates").select("*").eq("clinic_id", clinic.id).is("deleted_at", null),
    ]);

    const tg = await getTelegramConfig(admin, clinic.id);
    const counts = await processClinicReminders(admin, clinic.id, {
      settings: mergeSettings(settingsRes.data ?? null),
      templates: (templatesRes.data ?? []) as NotificationTemplate[],
      clinicName: clinic.name ?? "",
      userId: null,
      telegramToken: tg.botToken,
      includeStaff: true,
    });
    totals.appointment += counts.appointment;
    totals.payment += counts.payment;
    totals.doctor += counts.doctor;
    totals.ownerSummary += counts.ownerSummary;
    clinicsProcessed++;
  }

  return NextResponse.json({ ok: true, clinicsProcessed, ...totals, at: new Date().toISOString() });
}
