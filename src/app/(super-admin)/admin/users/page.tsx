import { Users } from "lucide-react";
import { listAllUsers } from "@/lib/db/queries/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { UserControls } from "@/components/admin/user-controls";
import { Card, CardContent } from "@/components/ui/card";
import type { AccountStatus } from "@/types/database";

export const metadata = { title: "Users · Super Admin" };

const STATUS_STYLES: Record<AccountStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

export default async function AdminUsersPage() {
  const [users, current] = await Promise.all([listAllUsers(), getCurrentUser()]);
  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Users}
        title="Users"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} awaiting approval · ${users.length} total`
            : `${users.length} ${users.length === 1 ? "user" : "users"} across all clinics`
        }
      />
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No users.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                  <tr>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Joined</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)] align-top last:border-0">
                      <td className="p-3">{u.full_name ?? "—"}</td>
                      <td className="p-3 text-[var(--muted-foreground)]">{u.email ?? "—"}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[u.status]}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-[var(--muted-foreground)]">{new Date(u.created_at).toLocaleDateString()}</td>
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
