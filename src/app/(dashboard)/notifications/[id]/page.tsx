import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDateTime } from "@/lib/date";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getNotification } from "@/lib/db/queries/notifications";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { RetryButton } from "@/components/notifications/notification-actions";

export const metadata = { title: "Notification" };

const TONE: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  skipped: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  failed: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

export default async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_READ))) redirect("/dashboard");

  const { id } = await params;
  const n = await getNotification(id);
  if (!n) notFound();

  const t = await getTranslations("notifications");
  const canSend = await hasPermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const typeLabel = t.has(`type.${n.type}`) ? t(`type.${n.type}`) : n.type.replace("_", " ");
  const statusLabel = t.has(`status.${n.status}`) ? t(`status.${n.status}`) : n.status;
  const channelLabel = n.channel === "telegram" ? t("settings.channel.telegram") : t("settings.channel.email");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("detail.back")} fallback="/notifications" />
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{typeLabel}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[n.status]}`}>{statusLabel}</span>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-3 p-5 text-sm">
          <Row label={t("table.channel")} value={channelLabel} />
          <Row
            label={t("table.recipient")}
            value={
              n.patient_id && n.patient_name ? (
                <Link href={`/patients/${n.patient_id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                  {n.patient_name}
                </Link>
              ) : (
                n.recipient
              )
            }
          />
          <Row label={t("detail.address")} value={n.recipient} />
          <Row label={t("table.when")} value={formatDateTime(n.created_at)} />
          {n.sent_at && <Row label={t("detail.sentAt")} value={formatDateTime(n.sent_at)} />}
          <Row label={t("detail.attempts")} value={String(n.attempts ?? 0)} />
          {n.error && <Row label={t("detail.error")} value={<span className="text-[var(--destructive)]">{n.error}</span>} />}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          {n.subject && (
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">{t("detail.subject")}</p>
              <p className="text-sm font-medium">{n.subject}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">{t("detail.message")}</p>
            {n.channel === "email" ? (
              <div className="prose prose-sm mt-1 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: n.body }} />
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {canSend && (n.status === "failed" || n.status === "skipped") && (
        <div>
          <RetryButton id={n.id} />
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
