import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Settings as SettingsIcon } from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getRolePermissionKeys } from "@/lib/auth/guard";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const { role } = getClinicClaims(await getCurrentUser());
  const isSuperAdmin = role === "super_admin";
  const allowed = isSuperAdmin ? null : await getRolePermissionKeys(role ?? "");
  const can = (perm: string) => isSuperAdmin || !!allowed?.has(perm);
  const sections = SETTINGS_SECTIONS.filter((s) => can(s.permission));
  const t = await getTranslations("settings");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={SettingsIcon}
        title={t("title")}
        subtitle={t("configure", { clinic: clinic.name })}
      />

      {sections.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noAccess")}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors hover:border-brand-300 hover:shadow-sm dark:hover:border-brand-500/40">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium group-hover:text-brand-700 dark:group-hover:text-brand-400">{t(`sections.${s.key}.label`)}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{t(`sections.${s.key}.description`)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
