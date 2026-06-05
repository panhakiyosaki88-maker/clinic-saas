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
import type { BillableLine, MembershipBenefit, BillingAlerts } from "@/lib/db/queries/visit-billing";
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
}: {
  patientId: string;
  visitId: string | null;
  lines: BillableLine[];
  membership: MembershipBenefit | null;
  alerts: BillingAlerts;
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
  const [applyMembership, setApplyMembership] = React.useState(!!membership);
  const [manualDiscount, setManualDiscount] = React.useState("0");
  const [tax, setTax] = React.useState("0");
  const [notes, setNotes] = React.useState("");

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

  const selected = rows.filter((r) => r.selected);
  const subtotal = selected.reduce((s, r) => s + num(r.quantity) * num(r.unitPrice), 0);
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
    const payload = selected
      .filter((r) => r.description.trim())
      .map((r) => ({
        source: r.source,
        sourceId: r.sourceId || undefined,
        category: r.category,
        description: r.description,
        quantity: num(r.quantity),
        unitPrice: num(r.unitPrice),
      }));
    if (payload.length === 0) {
      setError("Select at least one charge.");
      return;
    }
    startTransition(async () => {
      const res = await createInvoiceFromVisit({
        patientId,
        visitId: visitId ?? undefined,
        discount: discountTotal,
        tax: num(tax),
        notes,
        asDraft,
        lines: payload,
      });
      if (!res.ok) return setError(res.error);
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
          return (
            <section key={cat} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {SERVICE_CATEGORY_LABELS[cat]}
              </h3>
              <div className="space-y-2">
                {group.map((r) => (
                  <div key={r.key} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_4.5rem_6rem_auto]">
                    <input type="checkbox" checked={r.selected} onChange={(e) => patch(r.key, { selected: e.target.checked })} />
                    <Input value={r.description} placeholder="Description" onChange={(e) => patch(r.key, { description: e.target.value })} />
                    <Input type="number" step="0.01" value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} title="Quantity" />
                    <Input
                      type="number"
                      step="0.01"
                      value={r.unitPrice}
                      onChange={(e) => patch(r.key, { unitPrice: e.target.value })}
                      title="Unit price (override)"
                      className={r.needsPrice && num(r.unitPrice) === 0 ? "border-amber-400" : undefined}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(r.key)}>✕</Button>
                  </div>
                ))}
              </div>
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
            <span>Total</span><span className="tabular-nums">{total.toFixed(2)}</span>
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
          <Button onClick={() => submit(false)} disabled={pending}>{pending ? "Creating…" : "Issue invoice"}</Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={pending}>Save as draft</Button>
        </div>
      </aside>
    </div>
  );
}
