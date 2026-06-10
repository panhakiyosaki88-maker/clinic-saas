import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { listAllUsers } from "@/lib/db/queries/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { UserControls } from "@/components/admin/user-controls";
import { Card, CardContent } from "@/components/ui/card";
import type { AccountStatus } from "@/types/database";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Users · Super Admin" };

const STATUS_STYLES: Record<AccountStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

export default async function AdminUsersPage() {
  const [users, current, t] = await Promise.all([listAllUsers(), getCurrentUser(), getTranslations("superAdmin.users")]);
  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Users}
        title={t("title")}
        subtitle={
          pendingCount > 0
            ? t("subtitlePending", { pending: pendingCount, total: users.length })
            : t("subtitle", { count: users.length })
        }
      />
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                  <tr>
                    <th className="p-3 font-medium">{t("thName")}</th>
                    <th className="p-3 font-medium">{t("thEmail")}</th>
                    <th className="p-3 font-medium">{t("thStatus")}</th>
                    <th className="p-3 font-medium">{t("thJoined")}</th>
                    <th className="p-3 font-medium">{t("thActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)] align-top last:border-0">
                      <td className="p-3">{u.full_name ?? "—"}</td>
                      <td className="p-3 text-[var(--muted-foreground)]">{u.email ?? "—"}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[u.status]}`}>
                          {t(`status.${u.status}`)}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-[var(--muted-foreground)]">{formatDate(u.created_at)}</td>
                      <td className="p-3">
                        <UserControls
                          userId={u.id}
                          email={u.email}
                          status={u.status}
                          isSelf={u.id === current?.id}
                        />
                      </td>
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
