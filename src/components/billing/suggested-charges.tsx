"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromSources } from "@/server/actions/billing";
import type { BillableAppointment, BillableLab } from "@/lib/db/queries/billing-suggestions";
import { Button } from "@/components/ui/button";

/**
 * Lists a patient's unbilled charges (completed consultations, lab tests) and
 * bundles the selected ones into a draft invoice. Sources already billed never
 * appear, so there is no double-billing.
 */
export function SuggestedCharges({
  patientId,
  appointments,
  labs,
}: {
  patientId: string;
  appointments: BillableAppointment[];
  labs: BillableLab[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [appt, setAppt] = React.useState<Set<string>>(() => new Set(appointments.map((a) => a.id)));
  const [lab, setLab] = React.useState<Set<string>>(() => new Set(labs.map((l) => l.id)));

  if (appointments.length === 0 && labs.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No unbilled charges — everything is invoiced.</p>;
  }

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  };
  const count = appt.size + lab.size;

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createInvoiceFromSources({
        patientId,
        appointmentIds: [...appt],
        labIds: [...lab],
      });
      if (!res.ok) return setError(res.error);
      router.push(`/billing/${(res.data as { invoiceId: string }).invoiceId}`);
    });
  }

  return (
    <div className="space-y-3">
      {appointments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Consultations</p>
          {appointments.map((a) => (
            <label key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={appt.has(a.id)} onChange={() => toggle(appt, setAppt, a.id)} />
                {a.label}
                <span className="text-xs text-[var(--muted-foreground)]">{new Date(a.date).toLocaleDateString()}</span>
              </span>
              <span className="tabular-nums">{a.amount.toFixed(2)}</span>
            </label>
          ))}
        </div>
      )}

      {labs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Lab tests</p>
          {labs.map((l) => (
            <label key={l.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={lab.has(l.id)} onChange={() => toggle(lab, setLab, l.id)} />
                {l.test_name}
                <span className="text-xs text-[var(--muted-foreground)]">{new Date(l.date).toLocaleDateString()}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <Button size="sm" onClick={onCreate} disabled={pending || count === 0}>
        {pending ? "Creating…" : `Create draft invoice (${count})`}
      </Button>
      <p className="text-xs text-[var(--muted-foreground)]">Lab tests are added at 0 unless priced in the catalog — adjust on the draft.</p>
    </div>
  );
}
