import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { parseClinicCustomFields } from "@/lib/clinic-profile";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ClinicProfileForm } from "@/components/settings/clinic-profile-form";
import { ClinicLogoUploader } from "@/components/settings/clinic-logo-uploader";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "General · Settings" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--border)] py-2 last:border-0">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function ClinicSettingsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const canManage = await hasPermission(PERMISSIONS.CLINIC_MANAGE);
  const t = await getTranslations("settings");
  const customFields = parseClinicCustomFields(clinic.custom_fields);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Building2} title={t("sections.general.label")} subtitle={t("profileSubtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("language.title")}</CardTitle>
          <CardDescription>{t("language.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Clinic logo</CardTitle>
          </CardHeader>
          <CardContent>
            <ClinicLogoUploader clinicId={clinic.id} logoPath={clinic.logo_path} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clinic profile</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <ClinicProfileForm
              clinic={{
                name: clinic.name,
                subtitle: clinic.subtitle,
                contactEmail: clinic.contact_email,
                contactPhone: clinic.contact_phone,
                address: clinic.address,
                telegram: clinic.telegram,
                facebookPage: clinic.facebook_page,
                customFields,
              }}
            />
          ) : (
            <>
              <Field label="Clinic name" value={clinic.name} />
              <Field label="Subtitle" value={clinic.subtitle ?? ""} />
              <Field label="Contact email" value={clinic.contact_email ?? ""} />
              <Field label="Contact phone" value={clinic.contact_phone ?? ""} />
              <Field label="Address" value={clinic.address ?? ""} />
              <Field label="Telegram" value={clinic.telegram ?? ""} />
              <Field label="Facebook Page" value={clinic.facebook_page ?? ""} />
              {customFields.map((f, i) => (
                <Field key={i} label={f.label} value={f.value} />
              ))}
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Only the clinic owner can edit these details.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
