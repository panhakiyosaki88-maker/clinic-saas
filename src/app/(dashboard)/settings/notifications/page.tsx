import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getNotificationSettings, listNotificationTemplates } from "@/lib/db/queries/notification-settings";
import { PageHeader } from "@/components/page-header";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { NotificationTemplatesEditor } from "@/components/settings/notification-templates-editor";

export const metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_SEND))) redirect("/settings");

  const t = await getTranslations("notifications.settings");
  const [settings, templates] = await Promise.all([getNotificationSettings(), listNotificationTemplates()]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Bell} title={t("pageTitle")} subtitle={t("pageSubtitle")} />
      <NotificationSettingsForm initial={settings} />
      <NotificationTemplatesEditor templates={templates} />
    </main>
  );
}
