import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listMembers, listAssignableRoles, listRoleGuide } from "@/lib/db/queries/members";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { UserCog } from "lucide-react";
import { AddUserForm } from "@/components/members/add-user-form";
import { MemberList } from "@/components/members/member-list";
import { RolesGuide } from "@/components/members/roles-guide";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const canManage = await hasPermission(PERMISSIONS.STAFF_MANAGE);
  const [members, roles, roleGuide, t] = await Promise.all([
    listMembers(),
    listAssignableRoles(),
    listRoleGuide(),
    getTranslations("settings.staff"),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={UserCog}
        title={t("title")}
        subtitle={t("subtitle", { clinic: clinic.name })}
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t("addTitle")}</CardTitle>
            <CardDescription>{t("addDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AddUserForm roles={roles} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("teamTitle", { count: members.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList members={members} roles={roles} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("rolesTitle")}</CardTitle>
          <CardDescription>{t("rolesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RolesGuide roles={roleGuide} />
        </CardContent>
      </Card>
    </main>
  );
}
