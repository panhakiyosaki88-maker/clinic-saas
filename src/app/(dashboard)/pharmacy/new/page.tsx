import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MedicineForm } from "@/components/pharmacy/medicine-form";

export const metadata = { title: "New medicine" };

export default async function NewMedicinePage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PHARMACY_WRITE))) redirect("/pharmacy");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Link href="/pharmacy" className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Pharmacy
        </Link>
        <h1 className="mt-1 text-2xl font-bold">New medicine</h1>
      </header>
      <MedicineForm />
    </main>
  );
}
