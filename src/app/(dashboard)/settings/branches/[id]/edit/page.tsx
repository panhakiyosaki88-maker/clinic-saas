import { notFound, redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getBranch, getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BranchForm } from "@/components/settings/branch-form";
import { PaymentQrUploader } from "@/components/settings/payment-qr-uploader";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Edit branch · Settings" };

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await hasPermission(PERMISSIONS.CLINIC_MANAGE))) redirect("/settings/branches");

  const [branch, clinic] = await Promise.all([getBranch(id), getCurrentClinic()]);
  if (!branch || !clinic) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={MapPin} title="Edit branch" subtitle={branch.name} />
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

      <Card>
        <CardHeader>
          <CardTitle>Payment QR</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentQrUploader
            clinicId={clinic.id}
            branchId={branch.id}
            qrPath={branch.payment_qr_path}
            caption={branch.payment_qr_caption}
          />
        </CardContent>
      </Card>
    </main>
  );
}
