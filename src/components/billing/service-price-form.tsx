"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createServicePrice, updateServicePrice } from "@/server/actions/service-prices";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/lib/validations/service-price";
import type { ServicePrice } from "@/lib/db/queries/service-prices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface BranchOption { id: string; name: string }

export function ServicePriceForm({
  branches,
  service,
  defaultBranchId,
}: {
  branches: BranchOption[];
  service?: ServicePrice;
  defaultBranchId?: string | null;
}) {
  const router = useRouter();
  const isEdit = !!service;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      name: String(f.get("name") ?? ""),
      category: String(f.get("category") ?? "other") as never,
      code: String(f.get("code") ?? ""),
      unitPrice: Number(f.get("unitPrice") ?? 0),
      branchId: String(f.get("branchId") ?? ""),
      effectiveFrom: String(f.get("effectiveFrom") ?? ""),
    };
    startTransition(async () => {
      const res = isEdit ? await updateServicePrice(service!.id, payload) : await createServicePrice(payload);
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      if (!isEdit) form.reset();
      router.push("/billing/catalog");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="name" className="text-xs">Name</Label>
        <Input id="name" name="name" defaultValue={service?.name ?? ""} required />
        {fieldErrors.name?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}
      </div>
      <div className="space-y-1">
        <Label htmlFor="category" className="text-xs">Category</Label>
        <select id="category" name="category" className={selectClass} defaultValue={service?.category ?? "consultation"}>
          {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{SERVICE_CATEGORY_LABELS[c]}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="code" className="text-xs">Code (optional)</Label>
        <Input id="code" name="code" defaultValue={service?.code ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unitPrice" className="text-xs">Unit price</Label>
        <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={service?.unit_price ?? 0} />
      </div>
      {branches.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="branchId" className="text-xs">Branch (optional)</Label>
          <select id="branchId" name="branchId" className={selectClass} defaultValue={service?.branch_id ?? defaultBranchId ?? ""}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="effectiveFrom" className="text-xs">Effective from (optional)</Label>
        <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={service?.effective_from ?? ""} />
      </div>

      {error && <p className="text-xs text-[var(--destructive)] sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save changes" : "Add price"}</Button>
        {isEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { router.push("/billing/catalog"); router.refresh(); }}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
