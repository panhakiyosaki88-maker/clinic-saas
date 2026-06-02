"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createMedicine, updateMedicine } from "@/server/actions/pharmacy";
import type { Medicine } from "@/lib/db/queries/pharmacy";
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
      name: String(f.get("name") ?? ""),
      genericName: String(f.get("genericName") ?? ""),
      sku: String(f.get("sku") ?? ""),
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
          <Input id="name" name="name" defaultValue={medicine?.name ?? ""} required autoFocus />
        </Field>
        <Field label="Generic name" htmlFor="genericName">
          <Input id="genericName" name="genericName" defaultValue={medicine?.generic_name ?? ""} />
        </Field>
        <Field label="SKU / code" htmlFor="sku">
          <Input id="sku" name="sku" defaultValue={medicine?.sku ?? ""} />
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
