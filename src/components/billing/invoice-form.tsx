"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoice, editInvoice } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }
export interface BranchOption { id: string; name: string }
export interface InvoiceFormData {
  id: string;
  patient_id: string | null;
  branch_id: string | null;
  doctor_id: string | null;
  service_type: string | null;
  due_date: string | null;
  discount: number;
  tax: number;
  notes: string | null;
  items: { description: string; quantity: number; unit_price: number }[];
}

interface Row { key: number; description: string; quantity: string; unitPrice: string }
let keySeq = 1;
const blankRow = (): Row => ({ key: keySeq++, description: "", quantity: "1", unitPrice: "0" });

export function InvoiceForm({
  patients,
  doctors,
  branches,
  defaultPatientId,
  invoice,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  branches: BranchOption[];
  defaultPatientId?: string;
  invoice?: InvoiceFormData;
}) {
  const router = useRouter();
  const isEdit = !!invoice;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>(
    invoice && invoice.items.length > 0
      ? invoice.items.map((it) => ({ key: keySeq++, description: it.description, quantity: String(it.quantity), unitPrice: String(it.unit_price) }))
      : [blankRow()]
  );
  const [discount, setDiscount] = React.useState(String(invoice?.discount ?? "0"));
  const [tax, setTax] = React.useState(String(invoice?.tax ?? "0"));

  const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
  const subtotal = rows.reduce((sum, r) => sum + num(r.quantity) * num(r.unitPrice), 0);
  const total = subtotal - num(discount) + num(tax);

  function update(key: number, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function submit(form: HTMLFormElement, asDraft: boolean) {
    setError(null);
    const f = new FormData(form);
    const payload = {
      patientId: String(f.get("patientId") ?? ""),
      branchId: String(f.get("branchId") ?? ""),
      doctorId: String(f.get("doctorId") ?? ""),
      serviceType: String(f.get("serviceType") ?? ""),
      dueDate: String(f.get("dueDate") ?? ""),
      discount: num(discount),
      tax: num(tax),
      notes: String(f.get("notes") ?? ""),
      items: rows.map((r) => ({ description: r.description, quantity: num(r.quantity), unitPrice: num(r.unitPrice) })),
    };
    startTransition(async () => {
      const result = isEdit
        ? await editInvoice(invoice!.id, payload)
        : await createInvoice({ ...payload, asDraft });
      if (!result.ok) return setError(result.error);
      router.refresh();
      const id = isEdit ? invoice!.id : (result.data as { invoiceId: string }).invoiceId;
      router.push(`/billing/${id}`);
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget, false); }} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="patientId">Patient (optional)</Label>
          <select id="patientId" name="patientId" className={selectClass} defaultValue={invoice?.patient_id ?? defaultPatientId ?? ""}>
            <option value="">Walk-in / no patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctorId">Doctor (optional)</Label>
          <select id="doctorId" name="doctorId" className={selectClass} defaultValue={invoice?.doctor_id ?? ""}>
            <option value="">Unassigned</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        {branches.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="branchId">Branch (optional)</Label>
            <select id="branchId" name="branchId" className={selectClass} defaultValue={invoice?.branch_id ?? ""}>
              <option value="">No branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="serviceType">Service type (optional)</Label>
          <Input id="serviceType" name="serviceType" defaultValue={invoice?.service_type ?? ""} placeholder="e.g. Consultation" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date (optional)</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={invoice?.due_date ?? ""} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])}>Add item</Button>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="grid items-center gap-2 sm:grid-cols-[3fr_1fr_1fr_1fr_auto]">
            <Input placeholder="Description *" value={r.description} onChange={(e) => update(r.key, "description", e.target.value)} required />
            <Input placeholder="Qty" type="number" step="0.01" value={r.quantity} onChange={(e) => update(r.key, "quantity", e.target.value)} />
            <Input placeholder="Unit price" type="number" step="0.01" value={r.unitPrice} onChange={(e) => update(r.key, "unitPrice", e.target.value)} />
            <span className="text-right text-sm tabular-nums">{(num(r.quantity) * num(r.unitPrice)).toFixed(2)}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))} disabled={rows.length === 1}>✕</Button>
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
        <Textarea id="notes" name="notes" defaultValue={invoice?.notes ?? ""} />
      </div>

      {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}</Button>
        {!isEdit && (
          <Button type="button" variant="outline" disabled={pending}
            onClick={(e) => submit(e.currentTarget.form as HTMLFormElement, true)}>
            Save as draft
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
