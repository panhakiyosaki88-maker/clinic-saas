import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Stethoscope, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Doctors" };

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "visiting", "locum"] as const;
const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string; employment?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("doctors");
  if (!(await hasPermission(PERMISSIONS.DOCTORS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const { q, active, employment } = await searchParams;
  const canWrite = await hasPermission(PERMISSIONS.DOCTORS_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const doctors = await listDoctors({
    search: q,
    active: active === "active" || active === "inactive" ? active : undefined,
    employmentType: employment,
    branch: { activeId, primaryId },
  });
  const activeCount = doctors.filter((d) => d.is_active).length;
  const hasFilters = !!(q || active || employment);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Stethoscope}
        title={t("title")}
        subtitle={t("summary", { active: activeCount, total: doctors.length })}
        actions={
          canWrite && (
            <HeaderAction href="/doctors/new">
              <Plus /> {t("newDoctor")}
            </HeaderAction>
          )
        }
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className={`${selectClass} min-w-[220px] flex-1`}
        />
        <select name="active" defaultValue={active ?? ""} className={selectClass}>
          <option value="">{t("filter.allStatuses")}</option>
          <option value="active">{t("filter.active")}</option>
          <option value="inactive">{t("filter.inactive")}</option>
        </select>
        <select name="employment" defaultValue={employment ?? ""} className={selectClass}>
          <option value="">{t("filter.allEmployment")}</option>
          {EMPLOYMENT_TYPES.map((v) => (
            <option key={v} value={v}>{t(`employment.${v}`)}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">{t("filter.apply")}</Button>
        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctors">{t("filter.clear")}</Link>
          </Button>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          {doctors.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">
              {hasFilters ? t("empty.noMatch") : t("empty.none")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {doctors.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <DoctorAvatar name={d.full_name} avatarPath={d.avatar_path} size={80} />
                    <div className="min-w-0">
                      <Link href={`/doctors/${d.id}`} className="font-medium text-[var(--primary)] hover:underline">
                        {d.title ? `${d.title} ` : ""}{d.full_name}
                      </Link>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {d.specialization ?? t("labels.general")}
                        {d.license_number ? ` · ${t("labels.lic")} ${d.license_number}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.employment_type && (
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        {t(`employment.${d.employment_type}`)}
                      </span>
                    )}
                    {!d.is_active && (
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        {t("labels.inactive")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
