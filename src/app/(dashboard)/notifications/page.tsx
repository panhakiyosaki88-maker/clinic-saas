import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listNotifications } from "@/lib/db/queries/notifications";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";

export const metadata = { title: "Notifications" };

const TONE: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  skipped: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  failed: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

export default async function NotificationsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("notifications");
  const locale = await getLocale();
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const items = await listNotifications();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Bell}
        title={t("title")}
        subtitle={t("summary", { count: items.length })}
      />

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">
              {t("empty")}
            </p>
          ) : (
            <ResponsiveTable
              cards={items.map((n) => (
                <DataCard
                  key={n.id}
                  title={t.has(`type.${n.type}`) ? t(`type.${n.type}`) : n.type.replace("_", " ")}
                  actions={
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[n.status]}`}>
                      {t.has(`status.${n.status}`) ? t(`status.${n.status}`) : n.status}
                    </span>
                  }
                >
                  <DataCardRow label={t("table.recipient")} value={n.recipient} wide />
                  <DataCardRow label={t("table.when")} value={new Date(n.created_at).toLocaleString(locale)} wide />
                  {n.error && n.status === "failed" && (
                    <DataCardRow label={t("table.status")} value={<span className="text-[var(--destructive)]">{n.error}</span>} wide />
                  )}
                </DataCard>
              ))}
            >
            <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">{t("table.when")}</th>
                  <th className="p-3 font-medium">{t("table.type")}</th>
                  <th className="p-3 font-medium">{t("table.recipient")}</th>
                  <th className="p-3 font-medium">{t("table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 text-xs text-[var(--muted-foreground)]">{new Date(n.created_at).toLocaleString(locale)}</td>
                    <td className="p-3">{t.has(`type.${n.type}`) ? t(`type.${n.type}`) : n.type.replace("_", " ")}</td>
                    <td className="p-3 text-[var(--muted-foreground)]">{n.recipient}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[n.status]}`}>{t.has(`status.${n.status}`) ? t(`status.${n.status}`) : n.status}</span>
                      {n.error && n.status === "failed" && (
                        <span className="block text-xs text-[var(--destructive)]">{n.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
