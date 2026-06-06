"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromVisit, unbillCharge } from "@/server/actions/billing";
import type {
  BillableAppointment,
  BillableLab,
  BillablePrescription,
} from "@/lib/db/queries/billing-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);

/**
 * Lists a patient's charges (completed consultations, lab tests, prescriptions)
 * and bundles the selected ones into a draft invoice. Unbilled charges are
 * selectable with an editable price; lab tests can be priced each or as one
 * bundled line ("Price each" / "Price overall", like the Billing workspace).
 * Already-billed charges are shown read-only and stay listed until the patient's
 * open visit is closed/completed — they can never be re-billed.
 */
export function SuggestedCharges({
  patientId,
  appointments,
  labs,
  prescriptions,
  openVisitId,
}: {
  patientId: string;
  appointments: BillableAppointment[];
  labs: BillableLab[];
  prescriptions: BillablePrescription[];
  openVisitId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const openAppts = appointments.filter((a) => !a.billed);
  const openLabs = labs.filter((l) => !l.billed);
  const openRx = prescriptions.filter((p) => !p.billed);

  const [appt, setAppt] = React.useState<Set<string>>(() => new Set(openAppts.map((a) => a.id)));
  const [lab, setLab] = React.useState<Set<string>>(() => new Set(openLabs.map((l) => l.id)));
  const [rx, setRx] = React.useState<Set<string>>(() => new Set(openRx.map((p) => p.id)));

  // Editable unit price per chargeable source, prefilled from its detected amount.
  const [prices, setPrices] = React.useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const a of openAppts) seed[a.id] = String(a.amount);
    for (const l of openLabs) seed[l.id] = String(l.amount);
    for (const p of openRx) seed[p.id] = "0";
    return seed;
  });

  // Lab pricing mode: "individual" prices each test; "overall" bills every lab
  // test as one bundled line at a single price.
  const [labMode, setLabMode] = React.useState<"individual" | "overall">("individual");
  const [labOverall, setLabOverall] = React.useState(() =>
    String(openLabs.reduce((s, l) => s + l.amount, 0))
  );
  const [labDescription, setLabDescription] = React.useState("Laboratory Test");

  if (appointments.length === 0 && labs.length === 0 && prescriptions.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No unbilled charges — everything is invoiced.</p>;
  }

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  };
  const setPrice = (id: string, value: string) => setPrices((p) => ({ ...p, [id]: value }));

  function onUnbill(source: "appointment" | "lab" | "prescription", sourceId: string, description: string) {
    setError(null);
    startTransition(async () => {
      const res = await unbillCharge({ source, sourceId, description });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const overallLab = labMode === "overall" && openLabs.length > 0;
  const count = appt.size + rx.size + (overallLab ? (lab.size > 0 ? 1 : 0) : lab.size);

  function onCreate() {
    setError(null);
    type Line = {
      source: "appointment" | "lab" | "prescription";
      sourceId: string;
      linkSourceIds?: string[];
      category: "consultation" | "lab" | "other";
      description: string;
      quantity: number;
      unitPrice: number;
    };
    const lines: Line[] = [];

    for (const a of openAppts) {
      if (!appt.has(a.id)) continue;
      lines.push({ source: "appointment", sourceId: a.id, category: "consultation", description: a.label, quantity: 1, unitPrice: num(prices[a.id]) });
    }
    for (const p of openRx) {
      if (!rx.has(p.id)) continue;
      lines.push({ source: "prescription", sourceId: p.id, category: "other", description: p.label, quantity: 1, unitPrice: num(prices[p.id]) });
    }

    const selectedLabs = openLabs.filter((l) => lab.has(l.id));
    if (overallLab && selectedLabs.length > 0) {
      // One bundled "Laboratory Test" line covering every selected lab source.
      const ids = selectedLabs.map((l) => l.id);
      lines.push({
        source: "lab",
        sourceId: ids[0],
        linkSourceIds: ids.slice(1),
        category: "lab",
        description: labDescription.trim() || "Laboratory Test",
        quantity: 1,
        unitPrice: num(labOverall),
      });
    } else {
      for (const l of selectedLabs) {
        lines.push({ source: "lab", sourceId: l.id, category: "lab", description: l.test_name, quantity: 1, unitPrice: num(prices[l.id]) });
      }
    }

    if (lines.length === 0) {
      setError("Select at least one charge to bill.");
      return;
    }

    startTransition(async () => {
      const res = await createInvoiceFromVisit({
        patientId,
        visitId: openVisitId ?? undefined,
        discount: 0,
        tax: 0,
        notes: "",
        asDraft: true,
        lines,
      });
      if (!res.ok) return setError(res.error);
      router.push(`/billing/${(res.data as { invoiceId: string }).invoiceId}`);
    });
  }

  const billedTag = (
    <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
      Billed
    </span>
  );
  const unbillBtn = (source: "appointment" | "lab" | "prescription", sourceId: string, description: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 px-2 text-xs"
      onClick={() => onUnbill(source, sourceId, description)}
      disabled={pending}
      title="Remove from the draft invoice and edit"
    >
      Un-bill
    </Button>
  );

  return (
    <div className="space-y-3">
      {appointments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Consultations</p>
          {appointments.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between gap-3 text-sm ${a.billed ? "opacity-60" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <input type="checkbox" disabled={a.billed} checked={a.billed ? false : appt.has(a.id)} onChange={() => toggle(appt, setAppt, a.id)} />
                <span className="truncate">{a.label}</span>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(a.date).toLocaleDateString()}</span>
                {a.billed && billedTag}
              </span>
              {a.billed ? (
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-[var(--muted-foreground)]">{a.amount.toFixed(2)}</span>
                  {a.unbillable && unbillBtn("appointment", a.id, a.label)}
                </span>
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  className="w-24"
                  value={prices[a.id] ?? "0"}
                  onChange={(e) => setPrice(a.id, e.target.value)}
                  title="Unit price"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {labs.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Lab tests</p>
            {openLabs.length > 0 && (
              <div className="inline-flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
                {(["individual", "overall"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLabMode(m)}
                    className={`px-2.5 py-1 ${labMode === m ? "bg-brand-600 text-white" : "text-[var(--muted-foreground)]"}`}
                  >
                    {m === "individual" ? "Price each" : "Price overall"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {labs.map((l) =>
            l.billed ? (
              <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 opacity-60">
                  <input type="checkbox" disabled checked={false} readOnly />
                  <span className="truncate">{l.test_name}</span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(l.date).toLocaleDateString()}</span>
                  {billedTag}
                </span>
                {l.unbillable && unbillBtn("lab", l.id, l.test_name)}
              </div>
            ) : overallLab ? null : (
              <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <input type="checkbox" checked={lab.has(l.id)} onChange={() => toggle(lab, setLab, l.id)} />
                  <span className="truncate">{l.test_name}</span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(l.date).toLocaleDateString()}</span>
                </span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-24"
                  value={prices[l.id] ?? "0"}
                  onChange={(e) => setPrice(l.id, e.target.value)}
                  title="Unit price"
                />
              </div>
            )
          )}

          {overallLab && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Input
                  className="min-w-0 flex-1"
                  value={labDescription}
                  placeholder="Laboratory Test"
                  onChange={(e) => setLabDescription(e.target.value)}
                  title="Bundled description"
                />
                <Input
                  type="number"
                  step="0.01"
                  className="w-24"
                  value={labOverall}
                  onChange={(e) => setLabOverall(e.target.value)}
                  title="Overall laboratory price"
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Billed as one line covering {openLabs.length} test{openLabs.length === 1 ? "" : "s"}.
              </p>
            </div>
          )}
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Prescriptions</p>
          {prescriptions.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={`flex min-w-0 items-center gap-2 ${p.billed ? "opacity-60" : ""}`}>
                <input type="checkbox" disabled={p.billed} checked={p.billed ? false : rx.has(p.id)} onChange={() => toggle(rx, setRx, p.id)} />
                <span className="truncate">{p.label}</span>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(p.date).toLocaleDateString()}</span>
                {p.billed && billedTag}
              </span>
              {p.billed
                ? p.unbillable && unbillBtn("prescription", p.id, p.label)
                : (
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={prices[p.id] ?? "0"}
                    onChange={(e) => setPrice(p.id, e.target.value)}
                    title="Unit price"
                  />
                )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <Button size="sm" onClick={onCreate} disabled={pending || count === 0}>
        {pending ? "Creating…" : `Create draft invoice (${count})`}
      </Button>
      <p className="text-xs text-[var(--muted-foreground)]">
        Prices are prefilled from the catalog where available — adjust before creating the draft.
        Un-bill a charge to pull it back off the draft and re-price it.
      </p>
    </div>
  );
}
