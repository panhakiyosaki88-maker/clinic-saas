import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listLabCategories } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CategoryForm } from "@/components/lab/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Lab categories" };

export default async function LabCategoriesPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) redirect("/dashboard");

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const categories = await listLabCategories();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
        <h1 className="mt-1 text-2xl font-bold">Lab categories</h1>
      </header>

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>Add category</CardTitle></CardHeader>
          <CardContent><CategoryForm /></CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No categories yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{c.description ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
