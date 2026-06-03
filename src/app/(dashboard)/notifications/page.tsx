import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listNotifications } from "@/lib/db/queries/notifications";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

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
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view notifications.
        </p>
      </main>
    );
  }

  const items = await listNotifications();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={`${items.length} sent reminder${items.length === 1 ? "" : "s"} & messages`}
      />

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">
              No notifications yet. Send a reminder from an appointment or invoice.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Recipient</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 text-xs text-[var(--muted-foreground)]">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="p-3 capitalize">{n.type.replace("_", " ")}</td>
                    <td className="p-3 text-[var(--muted-foreground)]">{n.recipient}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[n.status]}`}>{n.status}</span>
                      {n.error && n.status === "failed" && (
                        <span className="block text-xs text-[var(--destructive)]">{n.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
