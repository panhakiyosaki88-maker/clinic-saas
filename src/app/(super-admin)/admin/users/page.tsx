import { listAllUsers } from "@/lib/db/queries/admin";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Users · Super Admin" };

export default async function AdminUsersPage() {
  const users = await listAllUsers();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Users ({users.length})</h1>
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No users.</p>
          ) : (
            <table className="w-full text-sm">
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
