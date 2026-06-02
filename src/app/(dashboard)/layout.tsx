import { redirect } from "next/navigation";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getRolePermissionKeys } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NAV } from "@/components/dashboard/nav-config";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { clinic_id, role } = getClinicClaims(user);
  if (!clinic_id) redirect("/onboarding");

  const isSuperAdmin = role === "super_admin";
  const clinic = await getCurrentClinic();

  // One query for the role's permissions (super admins implicitly hold all).
  const allowed = isSuperAdmin
    ? new Set(NAV.map((n) => n.permission).filter(Boolean) as string[])
    : await getRolePermissionKeys(role ?? "");

  const can = (perm: string | null) => perm === null || allowed.has(perm);
  const navKeys = NAV.filter((n) => can(n.permission)).map((n) => n.key);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const userName = typeof meta.full_name === "string" ? meta.full_name : "";

  return (
    <DashboardShell
      navKeys={navKeys}
      clinicName={clinic?.name ?? "Clinic"}
      clinicSlug={clinic?.slug ?? ""}
      userName={userName}
      userEmail={user.email ?? ""}
      isSuperAdmin={isSuperAdmin}
      quick={{
        appointment: can(PERMISSIONS.APPOINTMENTS_WRITE),
        patient: can(PERMISSIONS.PATIENTS_WRITE),
        prescription: can(PERMISSIONS.PRESCRIPTIONS_WRITE),
      }}
    >
      {children}
    </DashboardShell>
  );
}
