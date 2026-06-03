import { Users } from "lucide-react";
import { listAllUsers } from "@/lib/db/queries/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Users · Super Admin" };

export default async function AdminUsersPage() {
  const users = await listAllUsers();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Users}
        title="Users"
        subtitle={`${users.length} ${users.length === 1 ? "user" : "users"} across all clinics`}
      />
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No users.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3">{u.full_name ?? "—"}</td>
                    <td className="p-3 text-[var(--muted-foreground)]">{u.email ?? "—"}</td>
                    <td className="p-3 text-xs text-[var(--muted-foreground)]">{new Date(u.created_at).toLocaleDateString()}</td>
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
