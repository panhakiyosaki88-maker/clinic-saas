import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { getBranch } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BranchForm } from "@/components/settings/branch-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Edit branch · Settings" };

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await hasPermission(PERMISSIONS.CLINIC_MANAGE))) redirect("/settings/branches");

  const branch = await getBranch(id);
  if (!branch) notFound();
  const t = await getTranslations("settings.branches");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={MapPin} title={t("editBranch")} subtitle={branch.name} />
      <Card>
        <CardContent className="pt-6">
          <BranchForm
            branch={{
              id: branch.id,
              name: branch.name,
              code: branch.code,
              address: branch.address,
              phone: branch.phone,
              isPrimary: branch.is_primary,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
