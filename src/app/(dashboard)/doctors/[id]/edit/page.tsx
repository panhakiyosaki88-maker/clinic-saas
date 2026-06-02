import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getDoctor } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DoctorForm } from "@/components/doctors/doctor-form";

export const metadata = { title: "Edit doctor" };

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const { id } = await params;
  if (!(await hasPermission(PERMISSIONS.DOCTORS_WRITE))) redirect(`/doctors/${id}`);

  const doctor = await getDoctor(id);
  if (!doctor) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Link href={`/doctors/${id}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← {doctor.full_name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Edit doctor</h1>
      </header>
      <DoctorForm doctor={doctor} />
    </main>
  );
}
