import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPatients, listClinicTags, patientAge } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Users, Plus } from "lucide-react";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientsTable } from "@/components/patients/patients-table";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Patients" };

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; gender?: string; blood?: string; tag?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const t = await getTranslations("patients");
  const canRead = await hasPermission(PERMISSIONS.PATIENTS_READ);
  if (!canRead) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const { q, page, gender, blood, tag } = await searchParams;
  const canWrite = await hasPermission(PERMISSIONS.PATIENTS_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const [{ rows, total, page: current, pageCount }, clinicTags] = await Promise.all([
    listPatients({
      search: q,
      page: page ? Number(page) : 1,
      gender,
      bloodType: blood,
      tagId: tag,
      branch: { activeId, primaryId },
    }),
    listClinicTags(),
  ]);

  const baseParams = {
    ...(q ? { q } : {}),
    ...(gender ? { gender } : {}),
    ...(blood ? { blood } : {}),
    ...(tag ? { tag } : {}),
  };
  const pageHref = (p: number) =>
    `/patients?${new URLSearchParams({ ...baseParams, page: String(p) })}`;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Users}
        title={t("title")}
        subtitle={t("registered", { count: total })}
        actions={
          canWrite && (
            <HeaderAction href="/patients/new">
              <Plus /> {t("newPatient")}
            </HeaderAction>
          )
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select name="gender" defaultValue={gender ?? ""} className={selectClass}>
            <option value="">{t("filter.allGenders")}</option>
            <option value="male">{t("gender.male")}</option>
            <option value="female">{t("gender.female")}</option>
            <option value="other">{t("gender.other")}</option>
          </select>
          <select name="blood" defaultValue={blood ?? ""} className={selectClass}>
            <option value="">{t("filter.allBloodTypes")}</option>
            {BLOOD_TYPES.map((b) => (
              <option key={b} value={b}>{b === "unknown" ? t("filter.unknown") : b}</option>
            ))}
          </select>
          {clinicTags.length > 0 && (
            <select name="tag" defaultValue={tag ?? ""} className={selectClass}>
              <option value="">{t("filter.allTags")}</option>
              {clinicTags.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          )}
          <Button type="submit" variant="outline" size="sm">{t("filter.apply")}</Button>
          {(gender || blood || tag) && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`}>{t("filter.clear")}</Link>
            </Button>
          )}
        </form>
        <PatientSearch />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              {q || gender || blood || tag ? t("empty.noMatch") : t("empty.none")}
            </p>
          ) : (
            <PatientsTable
              canWrite={canWrite}
              rows={rows.map((p) => ({
                id: p.id,
                patient_number: p.patient_number,
                full_name: p.full_name,
                gender: p.gender,
                age: patientAge(p.date_of_birth),
                blood_type: p.blood_type,
                phone: p.phone,
                created_at: p.created_at,
                last_visit_date: p.last_visit_date,
                visit_count: p.visit_count,
              }))}
            />
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button asChild variant="outline" size="sm" disabled={current <= 1}>
            <Link href={pageHref(Math.max(1, current - 1))}>{t("pager.previous")}</Link>
          </Button>
          <span className="text-[var(--muted-foreground)]">
            {t("pager.pageOf", { current, total: pageCount })}
          </span>
          <Button asChild variant="outline" size="sm" disabled={current >= pageCount}>
            <Link href={pageHref(Math.min(pageCount, current + 1))}>{t("pager.next")}</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
