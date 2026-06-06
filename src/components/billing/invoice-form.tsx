"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createInvoice, editInvoice } from "@/server/actions/billing";
import { formatKHR, usdToKhr } from "@/lib/billing/currency";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategoryValue } from "@/lib/validations/invoice";
import { MedicinePicker, type MedicinePickOption } from "@/components/billing/medicine-picker";
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
  items: { description: string; quantity: number; unit_price: number; category?: ServiceCategoryValue }[];
}

interface Row { key: number; category: ServiceCategoryValue; description: string; quantity: string; unitPrice: string }
let keySeq = 1;
const blankRow = (category: ServiceCategoryValue): Row => ({
  key: keySeq++,
  category,
  description: "",
  quantity: "1",
  unitPrice: "0",
});

export function InvoiceForm({
  patients,
  doctors,
  branches,
  consultingByPatient = {},
  defaultPatientId,
  defaultBranchId,
  invoice,
  rate = 4100,
  medicines = [],
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  branches: BranchOption[];
  /** patient id → the doctor they're currently consulting with. */
  consultingByPatient?: Record<string, string>;
  defaultPatientId?: string;
  defaultBranchId?: string | null;
  invoice?: InvoiceFormData;
  /** USD→KHR rate for the live equivalent shown under the total. */
  rate?: number;
  /** Pharmacy catalog for the Pharmacy line's medicine typeahead. */
  medicines?: MedicinePickOption[];
}) {
  const router = useRouter();
  const isEdit = !!invoice;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const initialPatientId = invoice?.patient_id ?? defaultPatientId ?? "";
  const [patientId, setPatientId] = React.useState(initialPatientId);
  const [doctorId, setDoctorId] = React.useState(
    invoice?.doctor_id ?? consultingByPatient[initialPatientId] ?? ""
  );

  function onPatientChange(value: string) {
    setPatientId(value);
    // Auto-fill the doctor with the patient's consulting doctor.
    setDoctorId(consultingByPatient[value] ?? "");
  }
  const [rows, setRows] = React.useState<Row[]>(
    invoice && invoice.items.length > 0
      ? invoice.items.map((it) => ({
          key: keySeq++,
          category: it.category ?? "other",
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unit_price),
        }))
      : [blankRow("consultation")]
  );
  const [discount, setDiscount] = React.useState(String(invoice?.discount ?? "0"));
  const [tax, setTax] = React.useState(String(invoice?.tax ?? "0"));

  const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
  const subtotal = rows.reduce((sum, r) => sum + num(r.quantity) * num(r.unitPrice), 0);
  const total = subtotal - num(discount) + num(tax);

  function update(key: number, field: "description" | "quantity" | "unitPrice", value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function pickMedicine(key: number, m: MedicinePickOption) {
    setRows((rs) =>
      rs.map((r) => (r.key === key ? { ...r, description: m.name, unitPrice: String(m.selling_price) } : r))
    );
  }
  function addItem(category: ServiceCategoryValue) {
    setRows((rs) => [...rs, blankRow(category)]);
  }
  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
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
      items: rows.map((r) => ({ description: r.description, quantity: num(r.quantity), unitPrice: num(r.unitPrice), category: r.category })),
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
          <select id="patientId" name="patientId" className={selectClass} value={patientId} onChange={(e) => onPatientChange(e.target.value)}>
            <option value="">Walk-in / no patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctorId">Doctor (optional)</Label>
          <select id="doctorId" name="doctorId" className={selectClass} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Unassigned</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
        {branches.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="branchId">Branch (optional)</Label>
            <select id="branchId" name="branchId" className={selectClass} defaultValue={invoice?.branch_id ?? defaultBranchId ?? ""}>
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

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Category-grouped line items (same layout as the Billing Workspace) */}
        <div className="space-y-5">
          {SERVICE_CATEGORIES.map((cat) => {
            const group = rows.filter((r) => r.category === cat);
            if (group.length === 0) return null;
            return (
              <section key={cat} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {SERVICE_CATEGORY_LABELS[cat]}
                </h3>
                <div className="space-y-2">
                  <div className="hidden grid-cols-[1fr_5rem_7rem_5rem_2.5rem] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)] sm:grid">
                    <span>Description</span>
                    <span>Quantity</span>
                    <span>Unit price</span>
                    <span className="text-right">Amount</span>
                    <span aria-hidden />
                  </div>
                  {group.map((r) => (
                    <div key={r.key} className="grid items-center gap-2 sm:grid-cols-[1fr_5rem_7rem_5rem_2.5rem]">
                      {cat === "pharmacy" ? (
                        <MedicinePicker
                          value={r.description}
                          medicines={medicines}
                          onType={(v) => update(r.key, "description", v)}
                          onPick={(m) => pickMedicine(r.key, m)}
                        />
                      ) : (
                        <Input placeholder="Description *" value={r.description} onChange={(e) => update(r.key, "description", e.target.value)} required />
                      )}
                      <Input type="number" step="0.01" placeholder="Quantity" value={r.quantity} onChange={(e) => update(r.key, "quantity", e.target.value)} title="Quantity" />
                      <Input type="number" step="0.01" placeholder="Unit price" value={r.unitPrice} onChange={(e) => update(r.key, "unitPrice", e.target.value)} title="Unit price" />
                      <span className="text-right text-sm tabular-nums">{(num(r.quantity) * num(r.unitPrice)).toFixed(2)}</span>
                      <Button type="button" variant="ghost" size="sm" className="w-full px-0" onClick={() => removeRow(r.key)} disabled={rows.length === 1}>✕</Button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="self-center text-xs text-[var(--muted-foreground)]">Add manual item:</span>
            {(["consultation", "lab", "pharmacy", "procedure", "other"] as ServiceCategoryValue[]).map((c) => (
              <Button key={c} type="button" variant="outline" size="sm" onClick={() => addItem(c)}>
                + {SERVICE_CATEGORY_LABELS[c]}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary rail */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="space-y-2 rounded-lg border border-[var(--border)] p-4 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span className="tabular-nums">{subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="discount" className="text-[var(--muted-foreground)]">Discount</Label>
              <Input id="discount" className="w-24" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={invoice?.notes ?? ""} />
          </div>

          {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}</Button>
            {!isEdit && (
              <Button type="button" variant="outline" disabled={pending}
                onClick={(e) => submit(e.currentTarget.form as HTMLFormElement, true)}>
                Save as draft
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
