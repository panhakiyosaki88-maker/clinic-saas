import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ClinicProfileForm } from "@/components/settings/clinic-profile-form";
import { ClinicLogoUploader } from "@/components/settings/clinic-logo-uploader";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Building2} title="General" subtitle="Your clinic profile" />

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
              }}
            />
          ) : (
            <>
              <Field label="Clinic name" value={clinic.name} />
              <Field label="Subtitle" value={clinic.subtitle ?? ""} />
              <Field label="Contact email" value={clinic.contact_email ?? ""} />
              <Field label="Contact phone" value={clinic.contact_phone ?? ""} />
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
