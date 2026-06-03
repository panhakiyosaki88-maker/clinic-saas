import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCurrentClinic, listBranches } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AddBranchForm } from "@/components/settings/add-branch-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Branches · Settings" };

export default async function BranchesSettingsPage() {
  const [clinic, branches, canManage] = await Promise.all([
    getCurrentClinic(),
    listBranches(),
    hasPermission(PERMISSIONS.CLINIC_MANAGE),
  ]);
  if (!clinic) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={MapPin}
        title="Branches"
        subtitle={`${branches.length} ${branches.length === 1 ? "location" : "locations"}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {branches.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No branches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                  <tr>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Code</th>
                    <th className="p-3 font-medium">Address</th>
                    <th className="p-3 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium">
                        {b.name}
                        {b.is_primary && (
                          <span className="ml-2 inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                            Primary
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[var(--muted-foreground)]">{b.code ?? "—"}</td>
                      <td className="p-3 text-[var(--muted-foreground)]">{b.address ?? "—"}</td>
                      <td className="p-3 text-[var(--muted-foreground)]">{b.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add a branch</CardTitle>
          </CardHeader>
          <CardContent>
            <AddBranchForm />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
