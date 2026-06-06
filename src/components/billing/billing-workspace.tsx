"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromVisit } from "@/server/actions/billing";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  BILL_SOURCES,
  type ServiceCategoryValue,
} from "@/lib/validations/invoice";
import { formatKHR, usdToKhr } from "@/lib/billing/currency";
import type { MembershipBenefit, BillingAlerts } from "@/lib/db/queries/visit-billing";
import type { VisitCharge } from "@/lib/db/queries/visit-charges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BillSource = (typeof BILL_SOURCES)[number];

interface Row {
  key: number;
  source: BillSource;
  sourceId: string;
  category: ServiceCategoryValue;
  description: string;
  quantity: string;
  unitPrice: string;
  selected: boolean;
  needsPrice: boolean;
}

let keySeq = 1;
const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);

export function BillingWorkspace({
  patientId,
  visitId,
  lines,
  membership,
  alerts,
  rate = 4100,
  draftInvoiceId = null,
  initialDiscount = 0,
  initialTax = 0,
  initialNotes = "",
  labBundleInit = null,
}: {
  patientId: string;
  visitId: string | null;
  lines: VisitCharge[];
  membership: MembershipBenefit | null;
  alerts: BillingAlerts;
  /** USD→KHR rate for the live equivalent under the total. */
  rate?: number;
  /** When set, the workspace continues (edits) this existing draft invoice. */
  draftInvoiceId?: string | null;
  initialDiscount?: number;
  initialTax?: number;
  initialNotes?: string;
  /** When the continued draft had its labs bundled ("Price overall"), restore
   *  that mode with the saved description + price. */
  labBundleInit?: { description: string; price: number } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<Row[]>(() =>
    lines.map((l) => ({
      key: keySeq++,
      source: l.source as BillSource,
      sourceId: l.sourceId,
      category: l.category as ServiceCategoryValue,
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      selected: true,
      needsPrice: l.needsPrice,
    }))
  );
  // When continuing an existing draft its stored discount already folds in any
  // membership benefit, so seed it as the manual discount and leave the toggle
  // off (the user can re-apply); a fresh review applies the benefit by default.
  const [applyMembership, setApplyMembership] = React.useState(!!membership && !draftInvoiceId);
  const [manualDiscount, setManualDiscount] = React.useState(String(initialDiscount));
  const [tax, setTax] = React.useState(String(initialTax));
  const [notes, setNotes] = React.useState(initialNotes);

  // Laboratory pricing mode: "individual" prices each test; "overall" replaces
  // every lab test with a single bundled "Laboratory Test" line at one price (on
  // screen and on the printed invoice). All lab sources are still linked, so
  // nothing can be re-billed.
  const [labMode, setLabMode] = React.useState<"individual" | "overall">(
    labBundleInit ? "overall" : "individual"
  );
  const initialLabTotal = React.useMemo(
    () => lines.filter((l) => l.category === "lab").reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    [lines]
  );
  const [labOverall, setLabOverall] = React.useState(
    labBundleInit ? String(labBundleInit.price) : String(initialLabTotal)
  );
  const [labDescription, setLabDescription] = React.useState(labBundleInit?.description ?? "Laboratory Test");

  // Remember the review state for this patient/visit so leaving (Back) and
  // returning keeps the same lines selected and the same lab pricing settings.
  const storageKey = `billing-ws:${patientId}:${visitId ?? "none"}`;
  const restored = React.useRef(false);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as {
          selectedSourceIds?: string[];
          labMode?: "individual" | "overall";
          labOverall?: string;
          labDescription?: string;
          manualRows?: Omit<Row, "key">[];
        };
        if (s.labMode) setLabMode(s.labMode);
        if (s.labOverall != null) setLabOverall(s.labOverall);
        if (s.labDescription != null) setLabDescription(s.labDescription);
        if (s.selectedSourceIds) {
          const sel = new Set(s.selectedSourceIds);
          setRows((rs) => rs.map((r) => (r.sourceId ? { ...r, selected: sel.has(r.sourceId) } : r)));
        }
        // Re-create any manually-added rows (they aren't part of the detected set).
        if (s.manualRows?.length) {
          setRows((rs) => [...rs, ...s.manualRows!.map((m) => ({ ...m, key: keySeq++ }))]);
        }
      }
    } catch {
      /* ignore unavailable/blocked storage */
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (!restored.current) return;
    try {
      const selectedSourceIds = rows.filter((r) => r.selected && r.sourceId).map((r) => r.sourceId);
      const manualRows = rows
        .filter((r) => r.source === "manual")
        .map((r) => ({ source: r.source, sourceId: r.sourceId, category: r.category, description: r.description, quantity: r.quantity, unitPrice: r.unitPrice, selected: r.selected, needsPrice: r.needsPrice }));
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ selectedSourceIds, labMode, labOverall, labDescription, manualRows })
      );
    } catch {
      /* ignore */
    }
  }, [rows, labMode, labOverall, labDescription, storageKey]);

  function patch(key: number, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function addManual(category: ServiceCategoryValue) {
    setRows((rs) => [
      ...rs,
      { key: keySeq++, source: "manual", sourceId: "", category, description: "", quantity: "1", unitPrice: "0", selected: true, needsPrice: false },
    ]);
  }
  function removeRow(key: number) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  const labRows = rows.filter((r) => r.category === "lab");
  const overallLab = labMode === "overall" && labRows.length > 0;
  const selected = rows.filter((r) => r.selected);

  // In overall mode the labs are billed as one bundled line, so they don't count
  // individually toward the subtotal.
  const subtotal =
    selected
      .filter((r) => !(overallLab && r.category === "lab"))
      .reduce((s, r) => s + num(r.quantity) * num(r.unitPrice), 0) + (overallLab ? num(labOverall) : 0);
  const membershipDiscount =
    applyMembership && membership
      ? Math.max(
          0,
          Math.min(
            membership.benefitType === "percent" ? (subtotal * membership.benefitValue) / 100 : membership.benefitValue,
            subtotal
          )
        )
      : 0;
  const discountTotal = membershipDiscount + num(manualDiscount);
  const total = Math.max(0, subtotal - discountTotal + num(tax));

  function submit(asDraft: boolean) {
    setError(null);
    // Non-lab rows (and, in individual mode, lab rows) bill one item each.
    const payload = selected
      .filter((r) => r.description.trim())
      .filter((r) => !(overallLab && r.category === "lab"))
      .map((r) => ({
        source: r.source,
        sourceId: r.sourceId || undefined,
        linkSourceIds: undefined as string[] | undefined,
        category: r.category,
        description: r.description,
        quantity: num(r.quantity),
        unitPrice: num(r.unitPrice),
      }));

    // Overall mode: one bundled "Laboratory Test" line covering every lab source.
    if (overallLab) {
      const labIds = labRows.map((r) => r.sourceId).filter(Boolean);
      payload.push({
        source: "lab",
        sourceId: labIds[0] || undefined,
        linkSourceIds: labIds.slice(1),
        category: "lab",
        description: labDescription.trim() || "Laboratory Test",
        quantity: 1,
        unitPrice: num(labOverall),
      });
    }

    if (payload.length === 0) {
      setError("Select at least one charge.");
      return;
    }
    startTransition(async () => {
      const res = await createInvoiceFromVisit({
        patientId,
        visitId: visitId ?? undefined,
        invoiceId: draftInvoiceId ?? undefined,
        discount: discountTotal,
        tax: num(tax),
        notes,
        asDraft,
        lines: payload,
      });
      if (!res.ok) return setError(res.error);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      router.push(`/billing/${(res.data as { invoiceId: string }).invoiceId}`);
    });
  }

  const hasAlert = alerts.unbilledLabs > 0 || alerts.unbilledMedicines > 0 || alerts.membershipAvailable;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-5">
        {rows.length === 0 && (
          <p className="rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
            No unbilled charges detected for this patient. Add a manual item below.
          </p>
        )}

        {SERVICE_CATEGORIES.map((cat) => {
          const group = rows.filter((r) => r.category === cat);
          if (group.length === 0) return null;
          const isLab = cat === "lab";
          const labOverallMode = isLab && labMode === "overall";
          return (
            <section key={cat} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {SERVICE_CATEGORY_LABELS[cat]}
                </h3>
                {isLab && (
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
              <div className="hidden grid-cols-[1.5rem_1fr_4.5rem_6rem_5rem_2rem] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)] sm:grid">
                <span aria-hidden />
                <span>Description</span>
                <span>Quantity</span>
                <span>Unit price</span>
                <span className="text-right">Amount</span>
                <span aria-hidden />
              </div>
              {labOverallMode ? (
                <div className="space-y-2">
                  <div className="grid items-center gap-2 sm:grid-cols-[1.5rem_1fr_4.5rem_6rem_5rem_2rem]">
                    <span aria-hidden className="h-4 w-4" />
                    <Input
                      value={labDescription}
                      placeholder="Laboratory Test"
                      onChange={(e) => setLabDescription(e.target.value)}
                    />
                    <Input type="number" value="1" disabled title="Quantity" />
                    <Input
                      type="number"
                      step="0.01"
                      value={labOverall}
                      onChange={(e) => setLabOverall(e.target.value)}
                      title="Overall laboratory price"
                    />
                    <span className="text-right text-sm tabular-nums">{num(labOverall).toFixed(2)}</span>
                    <span aria-hidden />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Billed as one line covering {group.length} test{group.length === 1 ? "" : "s"}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {group.map((r) => (
                    <div key={r.key} className="grid items-center gap-2 sm:grid-cols-[1.5rem_1fr_4.5rem_6rem_5rem_2rem]">
                      <input type="checkbox" checked={r.selected} onChange={(e) => patch(r.key, { selected: e.target.checked })} />
                      {r.source === "manual" ? (
                        <Input value={r.description} placeholder="Description" onChange={(e) => patch(r.key, { description: e.target.value })} />
                      ) : (
                        // Detected lines keep their name fixed so prices round-trip when
                        // continuing the draft (matched by description).
                        <span className="truncate text-sm" title={r.description}>{r.description}</span>
                      )}
                      <Input type="number" step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} title="Quantity" />
                      <Input
                        type="number"
                        step="0.01"
                        value={r.unitPrice}
                        onChange={(e) => patch(r.key, { unitPrice: e.target.value })}
                        title="Unit price (override)"
                        className={r.needsPrice && num(r.unitPrice) === 0 ? "border-amber-400" : undefined}
                      />
                      <span className="text-right text-sm tabular-nums">{(num(r.quantity) * num(r.unitPrice)).toFixed(2)}</span>
                      <Button type="button" variant="ghost" size="sm" className="w-full px-0" onClick={() => removeRow(r.key)}>✕</Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="self-center text-xs text-[var(--muted-foreground)]">Add manual item:</span>
          {(["consultation", "procedure", "other"] as ServiceCategoryValue[]).map((c) => (
            <Button key={c} type="button" variant="outline" size="sm" onClick={() => addManual(c)}>
              + {SERVICE_CATEGORY_LABELS[c]}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary rail */}
      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        {hasAlert && (
          <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950/40">
            {alerts.unbilledLabs > 0 && <p>⚠ {alerts.unbilledLabs} unbilled lab test{alerts.unbilledLabs === 1 ? "" : "s"}</p>}
            {alerts.unbilledMedicines > 0 && <p>⚠ {alerts.unbilledMedicines} unbilled medicine{alerts.unbilledMedicines === 1 ? "" : "s"}</p>}
            {alerts.membershipAvailable && membership && <p>★ {membership.planName} benefit available</p>}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-[var(--border)] p-4 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span className="tabular-nums">{subtotal.toFixed(2)}</span></div>

          {membership && (
            <label className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                <input type="checkbox" checked={applyMembership} onChange={(e) => setApplyMembership(e.target.checked)} />
                Membership ({membership.benefitType === "percent" ? `${membership.benefitValue}%` : membership.benefitValue})
              </span>
              <span className="tabular-nums text-[var(--destructive)]">−{membershipDiscount.toFixed(2)}</span>
            </label>
          )}

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="discount" className="text-[var(--muted-foreground)]">Discount</Label>
            <Input id="discount" className="w-24" type="number" step="0.01" value={manualDiscount} onChange={(e) => setManualDiscount(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="tax" className="text-[var(--muted-foreground)]">Tax</Label>
            <Input id="tax" className="w-24" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
          </div>

          <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
            <span>Total (USD)</span><span className="tabular-nums">${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>≈ KHR</span><span className="tabular-nums">{formatKHR(usdToKhr(total, rate))}</span>
          </div>
        </div>

        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

        <div className="flex flex-col gap-2">
          <Button onClick={() => submit(false)} disabled={pending}>{pending ? "Saving…" : "Issue invoice"}</Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={pending}>
            {draftInvoiceId ? "Update draft" : "Save as draft"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
