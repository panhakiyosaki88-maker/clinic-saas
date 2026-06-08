import { getTranslations } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { listRecentAuditLogs } from "@/lib/db/queries/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Audit log · Super Admin" };

export default async function AdminAuditPage() {
  const [logs, t] = await Promise.all([listRecentAuditLogs(), getTranslations("superAdmin.audit")]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={ScrollText}
        title={t("title")}
        subtitle={t("subtitle", { count: logs.length })}
      />
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">{t("thWhen")}</th>
                  <th className="p-3 font-medium">{t("thAction")}</th>
                  <th className="p-3 font-medium">{t("thTable")}</th>
                  <th className="p-3 font-medium">{t("thClinic")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 text-xs text-[var(--muted-foreground)]">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-3">{l.action}</td>
                    <td className="p-3 font-mono text-xs">{l.table_name}</td>
                    <td className="p-3 font-mono text-xs text-[var(--muted-foreground)]">{l.clinic_id?.slice(0, 8) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
