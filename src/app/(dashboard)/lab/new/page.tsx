import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { listDoctors } from "@/lib/db/queries/doctors";
import { listLabCategoryTree } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LAB_TEST_PANEL, type LabTestGroup } from "@/lib/lab/test-panel";
import { LabRequestForm } from "@/components/lab/lab-request-form";

export const metadata = { title: "New lab request" };

export default async function NewLabRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_WRITE))) redirect("/lab");

  const sp = await searchParams;
  const [patients, doctors, tree] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    listLabCategoryTree(),
  ]);

  // Drive the test picker from the clinic's own Lab Categories so the two stay
  // in sync: each group is a section, each subgroup a selectable test (a group
  // with no subgroups is itself selectable). Fall back to the standard panel
  // only when the clinic has not defined any categories yet.
  const panel: LabTestGroup[] =
    tree.length > 0
      ? tree.map((g) => ({
          title: g.name,
          tests: g.children.length > 0 ? g.children.map((c) => c.name) : [g.name],
        }))
      : LAB_TEST_PANEL;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
        <h1 className="mt-1 text-2xl font-bold">New lab request</h1>
      </header>
      <LabRequestForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        defaultPatientId={sp.patientId}
        panel={panel}
      />
    </main>
  );
}
