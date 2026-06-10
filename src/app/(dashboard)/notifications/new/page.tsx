import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Send } from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listMembers } from "@/lib/db/queries/members";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/ui/back-link";
import { StaffMessageForm, type StaffOption } from "@/components/notifications/staff-message-form";

export const metadata = { title: "New message" };

export default async function NewNotificationPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_SEND))) redirect("/notifications");

  const t = await getTranslations("notifications.compose");
  const members = await listMembers();
  const options: StaffOption[] = members
    .filter((m) => m.user_id && m.full_name)
    .map((m) => ({ userId: m.user_id as string, name: m.full_name as string, role: m.role_name }));

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div>
        <BackLink label={t("back")} fallback="/notifications" />
        <PageHeader icon={Send} title={t("title")} subtitle={t("subtitle")} />
      </div>
      <StaffMessageForm members={options} />
    </main>
  );
}
