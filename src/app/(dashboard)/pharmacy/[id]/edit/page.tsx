import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getMedicine } from "@/lib/db/queries/pharmacy";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MedicineForm } from "@/components/pharmacy/medicine-form";

export const metadata = { title: "Edit medicine" };

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const { id } = await params;
  if (!(await hasPermission(PERMISSIONS.PHARMACY_WRITE))) redirect(`/pharmacy/${id}`);

  const medicine = await getMedicine(id);
  if (!medicine) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Link href={`/pharmacy/${id}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← {medicine.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Edit medicine</h1>
      </header>
      <MedicineForm medicine={medicine} />
    </main>
  );
}
