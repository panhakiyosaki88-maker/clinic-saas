import { redirect } from "next/navigation";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getRolePermissionKeys } from "@/lib/auth/guard";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { role } = getClinicClaims(user);
  const isSuperAdmin = role === "super_admin";
  const allowed = isSuperAdmin ? null : await getRolePermissionKeys(role ?? "");
  const can = (perm: string) => isSuperAdmin || !!allowed?.has(perm);

  const tabs = SETTINGS_SECTIONS.filter((s) => can(s.permission)).map((s) => ({
    href: s.href,
    label: s.label,
  }));

  return (
    <>
      <SettingsNav tabs={tabs} />
      {children}
    </>
  );
}
