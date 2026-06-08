"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordDispense } from "@/server/actions/visits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm";

export interface MedicineOption {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  /** Pre-filled when the picker is scoped to this visit's prescription. */
  prescribed_quantity?: number;
}

export function DispenseForm({
  patientId,
  visitId,
  medicines,
}: {
  patientId: string;
  visitId?: string | null;
  medicines: MedicineOption[];
}) {
  const router = useRouter();
  const t = useTranslations("billing.dispenseForm");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [medicineId, setMedicineId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("0");

  function onPick(id: string) {
    setMedicineId(id);
    const m = medicines.find((x) => x.id === id);
    if (m) {
      setUnitPrice(String(m.selling_price));
      if (m.prescribed_quantity != null) setQuantity(String(m.prescribed_quantity));
    }
  }

  const chosen = medicines.find((m) => m.id === medicineId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await recordDispense({
        patientId,
        visitId: visitId ?? undefined,
        medicineId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      });
      if (!res.ok) return setError(res.error);
      setMedicineId(""); setQuantity("1"); setUnitPrice("0");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1.5fr_0.6fr_1fr_auto]">
      <div className="space-y-1 sm:col-span-4">
        <Label className="text-xs">{t("medicine")}</Label>
        <select className={selectClass} value={medicineId} onChange={(e) => onPick(e.target.value)} required>
          <option value="" disabled>{t("selectMedicine")}</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {t("stock", { count: m.stock_quantity })}{m.prescribed_quantity != null ? ` · Rx ×${m.prescribed_quantity}` : ""}
            </option>
          ))}
        </select>
      </div>
      <Input type="number" step="1" placeholder={t("quantity")} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <Input type="number" step="0.01" placeholder={t("unitPrice")} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
      <Button type="submit" size="sm" disabled={pending || !medicineId}>{pending ? "…" : t("dispense")}</Button>
      {chosen && Number(quantity) > chosen.stock_quantity && (
        <p className="text-xs text-amber-600 sm:col-span-4">{t("onlyInStock", { count: chosen.stock_quantity })}</p>
      )}
      {error && <p className="text-xs text-[var(--destructive)] sm:col-span-4">{error}</p>}
    </form>
  );
}
