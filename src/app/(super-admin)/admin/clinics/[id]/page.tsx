import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinicForAdmin } from "@/lib/db/queries/admin";
import { ClinicControls } from "@/components/admin/clinic-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Clinic · Super Admin" };

export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getClinicForAdmin(id);
  if (!detail) notFound();
  const { clinic, subscription, patientCount, memberCount } = detail;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Link href="/admin/clinics" className="text-sm text-[var(--muted-foreground)] hover:underline">← Clinics</Link>
        <h1 className="mt-1 text-2xl font-bold">{clinic.name}</h1>
        <p className="font-mono text-xs text-[var(--muted-foreground)]">/{clinic.slug} · {clinic.contact_email ?? "—"}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Patients</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{patientCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Members</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{memberCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Plan limits</CardTitle></CardHeader><CardContent><p className="text-xs text-[var(--muted-foreground)]">{subscription ? `${subscription.max_patients} pt · ${subscription.max_doctors} dr · ${subscription.max_branches} br` : "—"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Manage</CardTitle></CardHeader>
        <CardContent>
          <ClinicControls clinicId={clinic.id} status={clinic.status} plan={subscription?.plan ?? null} />
        </CardContent>
      </Card>
    </main>
  );
}
