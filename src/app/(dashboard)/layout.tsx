import { redirect } from "next/navigation";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getAccountStatus } from "@/lib/auth/account";
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

  // Defensive: a non-approved account must never reach the app shell.
  if (!isSuperAdmin && (await getAccountStatus()) !== "approved") {
    redirect("/account-pending");
  }
  const clinic = await getCurrentClinic();

  // One query for the role's permissions. Super admins implicitly hold every
  // permission, so `can` short-circuits for them (matches the dashboard page).
  const allowed = isSuperAdmin ? new Set<string>() : await getRolePermissionKeys(role ?? "");

  const can = (perm: string | string[] | null) =>
    perm === null ||
    isSuperAdmin ||
    (Array.isArray(perm) ? perm.some((p) => allowed.has(p)) : allowed.has(perm));
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
