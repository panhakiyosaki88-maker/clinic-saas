"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";
import { updateModuleCatalogPrice, type ModulePriceSource } from "@/server/actions/service-prices";
import { formatUSD } from "@/lib/billing/currency";
import { Button } from "@/components/ui/button";

/**
 * Read-only price that, for billing editors, expands into a small inline editor
 * to change a module catalog's price (Lab test / Imaging service / Procedure)
 * straight from the Price Catalog. Saves via updateModuleCatalogPrice.
 */
export function InlinePriceEditor({
  source,
  id,
  price,
  canEdit,
}: {
  source: ModulePriceSource;
  id: string;
  price: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("billingSettings.catalog");
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(String(price));
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState(false);

  if (!canEdit) {
    return <span className="tabular-nums">{formatUSD(price)}</span>;
  }

  function save() {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
      setError(true);
      return;
    }
    setError(false);
    startTransition(async () => {
      const res = await updateModuleCatalogPrice(source, id, next);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(price));
          setEditing(true);
        }}
        className="group inline-flex items-center gap-1.5 tabular-nums hover:text-[var(--primary)]"
        title={t("editPriceHint")}
      >
        {formatUSD(price)}
        <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center justify-end gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        autoFocus
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className={`w-24 rounded-md border bg-[var(--background)] px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-100 ${
          error ? "border-[var(--destructive)]" : "border-[var(--border)] focus:border-brand-400"
        }`}
      />
      <Button variant="ghost" size="icon" disabled={pending} onClick={save} aria-label={t("save")}>
        <Check className="size-4 text-emerald-600" />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending} onClick={() => setEditing(false)} aria-label={t("cancel")}>
        <X className="size-4 text-slate-400" />
      </Button>
    </span>
  );
}
