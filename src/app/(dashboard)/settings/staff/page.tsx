import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listMembers, listAssignableRoles } from "@/lib/db/queries/members";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { UserCog } from "lucide-react";
import { InviteForm } from "@/components/members/invite-form";
import { MemberList } from "@/components/members/member-list";
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
  const [members, roles] = await Promise.all([listMembers(), listAssignableRoles()]);

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
            <CardTitle>Invite a team member</CardTitle>
            <CardDescription>
              They&apos;ll get access as soon as they sign up with this email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm roles={roles} />
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
    </main>
  );
}
