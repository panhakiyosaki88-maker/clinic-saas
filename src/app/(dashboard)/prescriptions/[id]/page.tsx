import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getPrescription } from "@/lib/db/queries/prescriptions";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PrintButton } from "@/components/prescriptions/print-button";
import { DeletePrescriptionButton } from "@/components/prescriptions/delete-prescription-button";

export const metadata = { title: "Prescription" };

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PRESCRIPTIONS_READ))) redirect("/dashboard");

  const { id } = await params;
  const rx = await getPrescription(id);
  if (!rx) notFound();

  const canWrite = await hasPermission(PERMISSIONS.PRESCRIPTIONS_WRITE);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/prescriptions" className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Prescriptions
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
          {canWrite && <DeletePrescriptionButton prescriptionId={rx.id} patientId={rx.patient_id} />}
        </div>
      </div>

      {/* Printable document */}
      <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 print:border-0">
        <header className="mb-6 border-b border-[var(--border)] pb-4">
          <h1 className="text-xl font-bold">{rx.clinic_name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Prescription</p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Patient</p>
            <p className="font-medium">{rx.patient_name}</p>
            <p className="font-mono text-xs">{rx.patient_number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted-foreground)]">Date</p>
            <p className="font-medium">{new Date(rx.prescribed_at).toLocaleDateString()}</p>
            {rx.doctor_name && <p className="text-xs">Dr. {rx.doctor_name}</p>}
          </div>
        </div>

        <div className="mb-6 text-3xl font-serif">℞</div>

        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <tr>
              <th className="pb-2">Medicine</th>
              <th className="pb-2">Dosage</th>
              <th className="pb-2">Frequency</th>
              <th className="pb-2">Duration</th>
              <th className="pb-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rx.items.map((it) => (
              <tr key={it.id} className="border-b border-[var(--border)] align-top">
                <td className="py-2 font-medium">
                  {it.medicine_name}
                  {it.instructions && (
                    <span className="block text-xs font-normal text-[var(--muted-foreground)]">{it.instructions}</span>
                  )}
                </td>
                <td className="py-2">{it.dosage ?? "—"}</td>
                <td className="py-2">{it.frequency ?? "—"}</td>
                <td className="py-2">{it.duration ?? "—"}</td>
                <td className="py-2 text-right">{it.quantity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rx.notes && (
          <div className="mt-6 text-sm">
            <p className="text-xs text-[var(--muted-foreground)]">Notes</p>
            <p className="whitespace-pre-wrap">{rx.notes}</p>
          </div>
        )}

        <footer className="mt-12 flex justify-end">
          <div className="text-center text-sm">
            <div className="mb-1 h-px w-48 bg-[var(--border)]" />
            <p className="text-xs text-[var(--muted-foreground)]">
              {rx.doctor_name ? `Dr. ${rx.doctor_name}` : "Signature"}
            </p>
          </div>
        </footer>
      </article>

      <p className="text-center print:hidden">
        <Link href={`/patients/${rx.patient_id}`} className="text-sm text-[var(--primary)] hover:underline">
          View patient profile →
        </Link>
      </p>
    </main>
  );
}
