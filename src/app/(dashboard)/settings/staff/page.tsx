import { redirect } from "next/navigation";
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
  const [members, roles, roleGuide] = await Promise.all([
    listMembers(),
    listAssignableRoles(),
    listRoleGuide(),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={UserCog}
        title="Staff"
        subtitle={`Manage who can access ${clinic.name} and what they can do`}
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add a team member</CardTitle>
            <CardDescription>
              Create their login with a password — they can sign in right away.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddUserForm roles={roles} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList members={members} roles={roles} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles &amp; what they can do</CardTitle>
          <CardDescription>
            Pick the role that matches a person&apos;s job. This list reflects the
            access each role currently grants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolesGuide roles={roleGuide} />
        </CardContent>
      </Card>
    </main>
  );
}
