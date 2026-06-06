"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromVisit, unbillCharge } from "@/server/actions/billing";
import { recordDispense } from "@/server/actions/visits";
import type { VisitCharge, PrescribedMedicine, ChargeSource } from "@/lib/db/queries/visit-charges";
import { SERVICE_CATEGORY_LABELS, type ServiceCategoryValue } from "@/lib/validations/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);

// Charge categories shown in this panel, in display order.
const CATEGORY_ORDER: ServiceCategoryValue[] = ["consultation", "lab", "pharmacy", "procedure", "membership"];

/**
 * Lists every charge tied to a patient's open visit — consultations, lab tests,
 * dispensed medicines, procedures and membership — and bundles the selected ones
 * into a draft invoice. Unbilled charges are selectable with an editable price;
 * lab tests can be priced each or bundled ("Price each" / "Price overall").
 * Already-billed charges stay listed read-only (greyed) and can be un-billed back
 * to selectable while their invoice has no payments. Prescriptions appear as a
 * dispense block: dispensing a prescribed medicine writes the stock ledger and
 * adds it as a billable pharmacy charge above. Shares its detection with the
 * Billing Workspace so the two always agree.
 */
export function SuggestedCharges({
  patientId,
  visitId,
  charges,
  prescribedMedicines,
  hasDraft = false,
}: {
  patientId: string;
  visitId: string | null;
  charges: VisitCharge[];
  prescribedMedicines: PrescribedMedicine[];
  /** True when the visit already has a draft invoice — billing then routes
   *  through the workspace (which continues that draft) to avoid duplicates. */
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const unbilledCharges = charges.filter((c) => !c.billed);

  // Selected unbilled charges (default: all), keyed by sourceId (uuids are unique).
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(unbilledCharges.map((c) => c.sourceId))
  );
  // Editable unit price per unbilled charge, prefilled from its detected amount.
  const [prices, setPrices] = React.useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const c of unbilledCharges) seed[c.sourceId] = String(c.unitPrice);
    return seed;
  });
  // Editable quantity per unbilled charge, prefilled from its detected quantity.
  const [quantities, setQuantities] = React.useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const c of unbilledCharges) seed[c.sourceId] = String(c.quantity);
    return seed;
  });

  // Lab pricing mode: "individual" prices each test; "overall" bills every
  // unbilled lab test as one bundled line at a single price.
  const unbilledLabs = unbilledCharges.filter((c) => c.category === "lab");
  const [labMode, setLabMode] = React.useState<"individual" | "overall">("individual");
  const [labOverall, setLabOverall] = React.useState(() =>
    String(unbilledLabs.reduce((s, l) => s + l.unitPrice, 0))
  );
  const [labDescription, setLabDescription] = React.useState("Laboratory Test");

  if (charges.length === 0 && prescribedMedicines.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No charges on this visit yet.</p>;
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setPrice = (id: string, value: string) => setPrices((p) => ({ ...p, [id]: value }));
  const setQuantity = (id: string, value: string) => setQuantities((q) => ({ ...q, [id]: value }));

  function onUnbill(source: ChargeSource, sourceId: string, description: string) {
    setError(null);
    startTransition(async () => {
      const res = await unbillCharge({ source, sourceId, description });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function onDispense(med: PrescribedMedicine, quantity: number, unitPrice: number) {
    if (!med.medicineId) return;
    setError(null);
    startTransition(async () => {
      const res = await recordDispense({
        patientId,
        visitId: visitId ?? undefined,
        medicineId: med.medicineId!,
        quantity,
        unitPrice,
      });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const overallLab = labMode === "overall" && unbilledLabs.length > 0;
  const selectedNonLab = unbilledCharges.filter((c) => c.category !== "lab" && selected.has(c.sourceId)).length;
  const selectedLabCount = unbilledLabs.filter((c) => selected.has(c.sourceId)).length;
  const count = selectedNonLab + (overallLab ? (selectedLabCount > 0 ? 1 : 0) : selectedLabCount);

  const workspaceHref = `/billing/workspace?patientId=${patientId}${visitId ? `&visitId=${visitId}` : ""}`;

  function onCreate() {
    setError(null);
    type Line = {
      source: ChargeSource;
      sourceId: string;
      linkSourceIds?: string[];
      category: ServiceCategoryValue;
      description: string;
      quantity: number;
      unitPrice: number;
    };
    const lines: Line[] = [];

    for (const c of unbilledCharges) {
      if (c.category === "lab") continue; // handled below
      if (!selected.has(c.sourceId)) continue;
      lines.push({
        source: c.source,
        sourceId: c.sourceId,
        category: c.category as ServiceCategoryValue,
        description: c.description,
        quantity: num(quantities[c.sourceId] ?? String(c.quantity)) || 1,
        unitPrice: num(prices[c.sourceId] ?? String(c.unitPrice)),
      });
    }

    const selectedLabs = unbilledLabs.filter((c) => selected.has(c.sourceId));
    if (overallLab && selectedLabs.length > 0) {
      const ids = selectedLabs.map((l) => l.sourceId);
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
        lines.push({
          source: "lab",
          sourceId: l.sourceId,
          category: "lab",
          description: l.description,
          quantity: num(quantities[l.sourceId] ?? String(l.quantity)) || 1,
          unitPrice: num(prices[l.sourceId] ?? String(l.unitPrice)),
        });
      }
    }

    if (lines.length === 0) {
      setError("Select at least one charge to bill.");
      return;
    }

    startTransition(async () => {
      const res = await createInvoiceFromVisit({
        patientId,
        visitId: visitId ?? undefined,
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
  const unbillBtn = (source: ChargeSource, sourceId: string, description: string) => (
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

  // Shared column grid: [checkbox] description | Qty | Unit price | Amount | trailing.
  const rowGrid = "grid items-center gap-2 sm:grid-cols-[1.25rem_1fr_3.5rem_5rem_4.5rem_auto]";

  const columnHeader = (
    <div className={`hidden px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)] sm:grid sm:grid-cols-[1.25rem_1fr_3.5rem_5rem_4.5rem_auto]`}>
      <span aria-hidden />
      <span>Description</span>
      <span>Qty</span>
      <span>Unit price</span>
      <span className="text-right">Amount</span>
      <span aria-hidden />
    </div>
  );

  const billedRow = (c: VisitCharge) => (
    <div key={c.sourceId} className={`${rowGrid} opacity-60`}>
      <input type="checkbox" disabled checked={false} readOnly />
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate">{c.description}</span>
        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(c.date).toLocaleDateString()}</span>
        {billedTag}
      </span>
      <span className="text-sm tabular-nums text-[var(--muted-foreground)]">{c.quantity}</span>
      <span className="text-sm tabular-nums text-[var(--muted-foreground)]">{c.unitPrice.toFixed(2)}</span>
      <span className="text-right text-sm tabular-nums text-[var(--muted-foreground)]">{(c.quantity * c.unitPrice).toFixed(2)}</span>
      {c.unbillable ? unbillBtn(c.source, c.sourceId, c.description) : <span aria-hidden />}
    </div>
  );

  const unbilledRow = (c: VisitCharge) => {
    const qty = num(quantities[c.sourceId] ?? String(c.quantity));
    const price = num(prices[c.sourceId] ?? String(c.unitPrice));
    return (
      <div key={c.sourceId} className={rowGrid}>
        <input type="checkbox" checked={selected.has(c.sourceId)} onChange={() => toggle(c.sourceId)} />
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate">{c.description}</span>
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{new Date(c.date).toLocaleDateString()}</span>
        </span>
        <Input
          type="number"
          step="0.01"
          value={quantities[c.sourceId] ?? "1"}
          onChange={(e) => setQuantity(c.sourceId, e.target.value)}
          title="Quantity"
        />
        <Input
          type="number"
          step="0.01"
          value={prices[c.sourceId] ?? "0"}
          onChange={(e) => setPrice(c.sourceId, e.target.value)}
          title="Unit price"
        />
        <span className="text-right text-sm tabular-nums">{(qty * price).toFixed(2)}</span>
        <span aria-hidden />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const group = charges.filter((c) => c.category === cat);
        if (group.length === 0) return null;
        const isLab = cat === "lab";
        return (
          <div key={cat} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {SERVICE_CATEGORY_LABELS[cat]}
              </p>
              {isLab && unbilledLabs.length > 0 && (
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

            {columnHeader}
            {group.map((c) => {
              if (c.billed) return billedRow(c);
              if (isLab && overallLab) return null; // bundled below
              return unbilledRow(c);
            })}

            {isLab && overallLab && (
              <div className="space-y-1">
                <div className={rowGrid}>
                  <span aria-hidden />
                  <Input
                    value={labDescription}
                    placeholder="Laboratory Test"
                    onChange={(e) => setLabDescription(e.target.value)}
                    title="Bundled description"
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
                  Billed as one line covering {unbilledLabs.length} test{unbilledLabs.length === 1 ? "" : "s"}.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {prescribedMedicines.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Prescriptions — dispense to bill
          </p>
          {prescribedMedicines.map((m) => (
            <DispenseRow key={m.name} med={m} pending={pending} onDispense={onDispense} />
          ))}
          <p className="text-xs text-[var(--muted-foreground)]">
            Dispensing reduces stock and adds the medicine as a billable Pharmacy charge above.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {!hasDraft && (
          <Button size="sm" onClick={onCreate} disabled={pending || count === 0}>
            {pending ? "Creating…" : `Create draft invoice (${count})`}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={hasDraft ? "default" : "outline"}
          onClick={() => router.push(workspaceHref)}
          disabled={pending}
          title="Open the full billing workspace: it continues this visit's draft with every charge shown here — edit descriptions, quantities, manual items, discounts & tax, then issue"
        >
          {hasDraft ? "Edit draft in workspace →" : "Open billing workspace →"}
        </Button>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {hasDraft
          ? "This visit already has a draft invoice. Open the workspace to add these charges, apply discounts & tax, and issue it."
          : "Prices are prefilled from the catalog where available — adjust before creating the draft. Un-bill a charge to pull it back off the draft and re-price it. The billing workspace continues this same draft with every charge here (plus membership discount & tax)."}
      </p>
    </div>
  );
}

/** One prescribed-medicine row in the dispense block: editable qty + price with a
 *  Dispense button, or a status note when it can't be dispensed. */
function DispenseRow({
  med,
  pending,
  onDispense,
}: {
  med: PrescribedMedicine;
  pending: boolean;
  onDispense: (med: PrescribedMedicine, quantity: number, unitPrice: number) => void;
}) {
  const [qty, setQty] = React.useState(String(med.remainingQty || med.prescribedQty || 1));
  const [price, setPrice] = React.useState(String(med.sellingPrice));

  if (!med.medicineId) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm opacity-60">
        <span className="truncate">{med.name}</span>
        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">not in catalog</span>
      </div>
    );
  }
  if (med.remainingQty <= 0) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm opacity-60">
        <span className="truncate">{med.name}</span>
        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">Dispensed ✓</span>
      </div>
    );
  }

  const q = Number(qty) || 0;
  const overStock = q > med.stockQuantity;
  const amount = q * (Number(price) || 0);
  return (
    <div className="space-y-0.5">
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_3.5rem_5rem_4.5rem_auto]">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate">{med.name}</span>
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">Rx ×{med.remainingQty}</span>
        </span>
        <Input type="number" step="1" className="w-full" value={qty} onChange={(e) => setQty(e.target.value)} title="Quantity" />
        <Input type="number" step="0.01" className="w-full" value={price} onChange={(e) => setPrice(e.target.value)} title="Unit price" />
        <span className="text-right text-sm tabular-nums">{amount.toFixed(2)}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={pending || q < 1 || overStock}
          onClick={() => onDispense(med, q, Number(price) || 0)}
        >
          Dispense
        </Button>
      </div>
      {overStock && <p className="text-xs text-amber-600">Only {med.stockQuantity} in stock.</p>}
    </div>
  );
}
