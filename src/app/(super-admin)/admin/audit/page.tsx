import { listRecentAuditLogs } from "@/lib/db/queries/admin";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Audit log · Super Admin" };

export default async function AdminAuditPage() {
  const logs = await listRecentAuditLogs();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No audit entries.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Action</th>
                  <th className="p-3 font-medium">Table</th>
                  <th className="p-3 font-medium">Clinic</th>
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
