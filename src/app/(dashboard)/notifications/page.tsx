import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDateTime } from "@/lib/date";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listNotifications, type NotificationFilters } from "@/lib/db/queries/notifications";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { NotificationsToolbar } from "@/components/notifications/notifications-toolbar";
import { RetryButton, RunDueButton, RemindTomorrowButton } from "@/components/notifications/notification-actions";
import type { NotificationChannel, NotificationStatus, NotificationType } from "@/types/database";

export const metadata = { title: "Notifications" };

const TONE: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  skipped: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  failed: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

type Search = { type?: string; status?: string; channel?: string; q?: string; from?: string; to?: string };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("notifications");
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">{t("noPermission")}</p>
      </main>
    );
  }

  const canSend = await hasPermission(PERMISSIONS.NOTIFICATIONS_SEND);
  const sp = await searchParams;
  const filters: NotificationFilters = {
    type: sp.type as NotificationType | undefined,
    status: sp.status as NotificationStatus | undefined,
    channel: sp.channel as NotificationChannel | undefined,
    q: sp.q,
    from: sp.from,
    to: sp.to,
  };
  const items = await listNotifications(filters);

  const typeLabel = (x: NotificationType | string) => (t.has(`type.${x}`) ? t(`type.${x}`) : String(x).replace("_", " "));
  const statusLabel = (x: NotificationStatus | string) => (t.has(`status.${x}`) ? t(`status.${x}`) : String(x));
  const channelLabel = (x: NotificationChannel) => (x === "telegram" ? t("settings.channel.telegram") : t("settings.channel.email"));
  const canRetry = (s: string) => s === "failed" || s === "skipped";

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Bell}
        title={t("title")}
        subtitle={t("summary", { count: items.length })}
        actions={
          canSend && (
            <div className="flex flex-wrap gap-2">
              <Link href="/notifications/new">
                <Button size="sm" variant="outline">{t("compose.newMessage")}</Button>
              </Link>
              <RemindTomorrowButton />
              <RunDueButton />
            </div>
          )
        }
      />

      <NotificationsToolbar />

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
          ) : (
            <ResponsiveTable
              cards={items.map((n) => (
                <DataCard
                  key={n.id}
                  title={<Link href={`/notifications/${n.id}`} className="text-brand-600 hover:underline dark:text-brand-400">{typeLabel(n.type)}</Link>}
                  actions={
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[n.status]}`}>
                      {statusLabel(n.status)}
                    </span>
                  }
                >
                  <DataCardRow label={t("table.recipient")} value={n.patient_name ?? n.recipient} wide />
                  <DataCardRow label={t("table.channel")} value={channelLabel(n.channel)} />
                  <DataCardRow label={t("table.when")} value={formatDateTime(n.created_at)} wide />
                  {n.error && <DataCardRow label={t("table.status")} value={<span className="text-[var(--destructive)]">{n.error}</span>} wide />}
                  {canSend && canRetry(n.status) && <DataCardRow label="" value={<RetryButton id={n.id} />} />}
                </DataCard>
              ))}
            >
              <ScrollableX>
                <table className="w-full min-w-[48rem] text-sm">
                  <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                    <tr>
                      <th className="p-3 font-medium">{t("table.when")}</th>
                      <th className="p-3 font-medium">{t("table.type")}</th>
                      <th className="p-3 font-medium">{t("table.recipient")}</th>
                      <th className="p-3 font-medium">{t("table.channel")}</th>
                      <th className="p-3 font-medium">{t("table.status")}</th>
                      <th className="p-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((n) => (
                      <tr key={n.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="p-3 text-xs text-[var(--muted-foreground)]">{formatDateTime(n.created_at)}</td>
                        <td className="p-3">
                          <Link href={`/notifications/${n.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                            {typeLabel(n.type)}
                          </Link>
                        </td>
                        <td className="p-3 text-[var(--muted-foreground)]">
                          {n.patient_id && n.patient_name ? (
                            <Link href={`/patients/${n.patient_id}`} className="hover:underline">{n.patient_name}</Link>
                          ) : (
                            n.recipient
                          )}
                        </td>
                        <td className="p-3 text-[var(--muted-foreground)]">{channelLabel(n.channel)}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[n.status]}`}>{statusLabel(n.status)}</span>
                          {n.error && <span className="block text-xs text-[var(--destructive)]">{n.error}</span>}
                        </td>
                        <td className="p-3 text-right">{canSend && canRetry(n.status) && <RetryButton id={n.id} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableX>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
