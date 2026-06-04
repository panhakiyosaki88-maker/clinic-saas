"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createMedicine, updateMedicine, previewSku } from "@/server/actions/pharmacy";
import type { Medicine } from "@/lib/db/queries/pharmacy";
import { skuBase } from "@/lib/pharmacy/sku";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Field({ label, htmlFor, errors, children }: { label: string; htmlFor: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {errors?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}
    </div>
  );
}

export function MedicineForm({ medicine }: { medicine?: Medicine }) {
  const router = useRouter();
  const isEdit = !!medicine;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [name, setName] = React.useState(medicine?.name ?? "");
  const [strength, setStrength] = React.useState(medicine?.strength ?? "");
  const [autoSku, setAutoSku] = React.useState(true);
  const [manualSku, setManualSku] = React.useState(medicine?.sku ?? "");
  const [preview, setPreview] = React.useState(medicine?.sku ?? "");

  // Live SKU preview while auto-generating. The base updates instantly from the
  // shared helper; the real sequence is fetched (debounced) from the server.
  React.useEffect(() => {
    if (!autoSku || name.trim().length < 2) {
      setPreview("");
      return;
    }
    const t = setTimeout(async () => {
      const res = await previewSku(name, strength);
      if (res.ok) setPreview(res.data.sku);
    }, 400);
    return () => clearTimeout(t);
  }, [autoSku, name, strength]);

  const baseHint = name.trim().length >= 2 ? skuBase(name, strength) : "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const numOrUndef = (k: string) => {
      const s = String(f.get(k) ?? "");
      return s === "" ? undefined : Number(s);
    };
    const payload = {
      name,
      genericName: String(f.get("genericName") ?? ""),
      autoSku,
      sku: autoSku ? "" : manualSku,
      strength,
      category: String(f.get("category") ?? ""),
      unit: String(f.get("unit") ?? "unit") || "unit",
      reorderLevel: numOrUndef("reorderLevel") ?? 0,
      purchasePrice: numOrUndef("purchasePrice"),
      sellingPrice: numOrUndef("sellingPrice"),
      isActive: f.get("isActive") === "on",
    };

    startTransition(async () => {
      const result = isEdit ? await updateMedicine(medicine!.id, payload) : await createMedicine(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      const id = isEdit ? medicine!.id : (result.data as { medicineId: string }).medicineId;
      router.push(`/pharmacy/${id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" errors={fieldErrors.name}>
          <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Generic name" htmlFor="genericName">
          <Input id="genericName" name="genericName" defaultValue={medicine?.generic_name ?? ""} />
        </Field>
        <Field label="Strength" htmlFor="strength">
          <Input id="strength" name="strength" value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500mg, 1000IU, 5ml" />
        </Field>
        <Field label="Category" htmlFor="category">
          <Input id="category" name="category" defaultValue={medicine?.category ?? ""} />
        </Field>
        <Field label="Unit" htmlFor="unit">
          <Input id="unit" name="unit" defaultValue={medicine?.unit ?? "unit"} />
        </Field>
        <Field label="Reorder level" htmlFor="reorderLevel">
          <Input id="reorderLevel" name="reorderLevel" type="number" defaultValue={medicine?.reorder_level ?? 0} />
        </Field>
        <Field label="Purchase price" htmlFor="purchasePrice">
          <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" defaultValue={medicine?.purchase_price ?? ""} />
        </Field>
        <Field label="Selling price" htmlFor="sellingPrice">
          <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" defaultValue={medicine?.selling_price ?? ""} />
        </Field>
      </div>

      {/* SKU: auto-generate by default; uncheck for a manual override. */}
      <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="sku">SKU</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoSku} onChange={(e) => setAutoSku(e.target.checked)} />
            Auto-generate
          </label>
        </div>
        <Input
          id="sku"
          value={autoSku ? preview : manualSku}
          onChange={(e) => setManualSku(e.target.value)}
          readOnly={autoSku}
          placeholder={autoSku ? "Generated from name + strength" : "Enter SKU"}
          className={autoSku ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : ""}
        />
        {fieldErrors.sku?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}
        {autoSku ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            {baseHint
              ? `Format ${baseHint}-#### — assigned on save${isEdit ? " (existing SKU is kept)" : ""}.`
              : "Enter a name (and optional strength) to generate a SKU."}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">Manual override — must be unique.</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={medicine?.is_active ?? true} />
        Active
      </label>

      {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save changes" : "Add medicine"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
      {!isEdit && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Add opening stock from the medicine page after saving.
        </p>
      )}
    </form>
  );
}
