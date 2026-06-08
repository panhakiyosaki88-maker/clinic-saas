import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listLabCategoryTree } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CategoryForm } from "@/components/lab/category-form";
import { AddSubgroupForm, DeleteCategoryButton, ImportPanelButton } from "@/components/lab/lab-category-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Lab categories" };

export default async function LabCategoriesPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) redirect("/dashboard");

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const [groups, t] = await Promise.all([
    listLabCategoryTree(),
    getTranslations("lab.category"),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink label={t("backToList")} fallback="/lab" />
          <h1 className="mt-1 text-2xl font-bold">{t("pageTitle")}</h1>
        </div>
        {canWrite && <ImportPanelButton />}
      </header>

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>{t("newGroup")}</CardTitle></CardHeader>
          <CardContent>
            <CategoryForm />
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-6 text-sm text-[var(--muted-foreground)]">
              {t("empty")}{canWrite ? ` ${t("emptyImportHint")}` : ""}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base uppercase tracking-wide">{g.name}</CardTitle>
                {canWrite && <DeleteCategoryButton id={g.id} name={g.name} isGroup />}
              </CardHeader>
              <CardContent className="p-0">
                {g.children.length === 0 ? (
                  <p className="px-4 text-sm text-[var(--muted-foreground)]">{t("noSubgroups")}</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
                    {g.children.map((c) => (
                      <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span>{c.name}</span>
                        {canWrite && <DeleteCategoryButton id={c.id} name={c.name} />}
                      </li>
                    ))}
                  </ul>
                )}
                {canWrite && <AddSubgroupForm groupId={g.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
