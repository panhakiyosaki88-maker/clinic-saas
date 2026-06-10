import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getNotificationSettings, listNotificationTemplates } from "@/lib/db/queries/notification-settings";
import { getTelegramConfig, isTelegramConfigured } from "@/lib/notifications/telegram-config";
import { PageHeader } from "@/components/page-header";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { NotificationTemplatesEditor } from "@/components/settings/notification-templates-editor";
import { TelegramConnectCard } from "@/components/notifications/telegram-connect-card";
import { TelegramBotConfigForm } from "@/components/notifications/telegram-bot-config-form";

export const metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.NOTIFICATIONS_SEND))) redirect("/settings");

  const t = await getTranslations("notifications.settings");
  const tg = await getTranslations("notifications.telegram");
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: profile } = user
    ? await supabase.from("profiles").select("telegram_chat_id").eq("id", user.id).maybeSingle()
    : { data: null };

  const [settings, templates, tgConfig] = await Promise.all([
    getNotificationSettings(),
    listNotificationTemplates(),
    getTelegramConfig(supabase, clinic.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Bell} title={t("pageTitle")} subtitle={t("pageSubtitle")} />
      <NotificationSettingsForm initial={settings} />

      <TelegramBotConfigForm
        configured={isTelegramConfigured(tgConfig)}
        username={tgConfig.botUsername}
        source={tgConfig.source}
      />

      {user && (
        <TelegramConnectCard
          clinicId={clinic.id}
          kind="user"
          id={user.id}
          connected={!!profile?.telegram_chat_id}
          title={tg("myTitle")}
          description={tg("myDescription")}
        />
      )}

      <NotificationTemplatesEditor templates={templates} />
    </main>
  );
}
