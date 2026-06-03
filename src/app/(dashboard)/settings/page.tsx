import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle={`Configure ${clinic.name}`}
      />

      {sections.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have access to any settings.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-500/40">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400">{s.label}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{s.description}</p>
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
