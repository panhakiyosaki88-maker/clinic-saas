"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]";

export interface PatientOption { id: string; label: string }

interface Row { key: number; description: string; quantity: string; unitPrice: string }
let keySeq = 1;
const blankRow = (): Row => ({ key: keySeq++, description: "", quantity: "1", unitPrice: "0" });

export function InvoiceForm({
  patients,
  defaultPatientId,
}: {
  patients: PatientOption[];
  defaultPatientId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([blankRow()]);
  const [discount, setDiscount] = React.useState("0");
  const [tax, setTax] = React.useState("0");

  const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
  const subtotal = rows.reduce((sum, r) => sum + num(r.quantity) * num(r.unitPrice), 0);
  const total = subtotal - num(discount) + num(tax);

  function update(key: number, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createInvoice({
        patientId: String(f.get("patientId") ?? ""),
        discount: num(discount),
        tax: num(tax),
        notes: String(f.get("notes") ?? ""),
        items: rows.map((r) => ({
          description: r.description,
          quantity: num(r.quantity),
          unitPrice: num(r.unitPrice),
        })),
      });
      if (!result.ok) return setError(result.error);
      router.refresh();
      router.push(`/billing/${result.data.invoiceId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2 sm:max-w-sm">
        <Label htmlFor="patientId">Patient (optional)</Label>
        <select id="patientId" name="patientId" className={selectClass} defaultValue={defaultPatientId ?? ""}>
          <option value="">Walk-in / no patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])}>
            Add item
          </Button>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="grid items-center gap-2 sm:grid-cols-[3fr_1fr_1fr_1fr_auto]">
            <Input placeholder="Description *" value={r.description} onChange={(e) => update(r.key, "description", e.target.value)} required />
            <Input placeholder="Qty" type="number" step="0.01" value={r.quantity} onChange={(e) => update(r.key, "quantity", e.target.value)} />
            <Input placeholder="Unit price" type="number" step="0.01" value={r.unitPrice} onChange={(e) => update(r.key, "unitPrice", e.target.value)} />
            <span className="text-right text-sm tabular-nums">{(num(r.quantity) * num(r.unitPrice)).toFixed(2)}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))} disabled={rows.length === 1}>
              ✕
            </Button>
          </div>
        ))}
      </div>

      <div className="ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span className="tabular-nums">{subtotal.toFixed(2)}</span></div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="discount" className="text-[var(--muted-foreground)]">Discount</Label>
          <Input id="discount" className="w-28" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="tax" className="text-[var(--muted-foreground)]">Tax</Label>
          <Input id="tax" className="w-28" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
        <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
          <span>Total</span><span className="tabular-nums">{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create invoice"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
