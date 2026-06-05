"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { recordProcedure } from "@/server/actions/visits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm";

export interface ProcedureOption { id: string; name: string; default_price: number }

export function RecordProcedureForm({
  patientId,
  visitId,
  procedures,
}: {
  patientId: string;
  visitId?: string | null;
  procedures: ProcedureOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("0");
  const [procedureId, setProcedureId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");

  function onPick(id: string) {
    setProcedureId(id);
    const p = procedures.find((x) => x.id === id);
    if (p) {
      setName(p.name);
      setPrice(String(p.default_price));
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await recordProcedure({
        patientId,
        visitId: visitId ?? undefined,
        procedureId: procedureId || undefined,
        name,
        price: Number(price),
        quantity: Number(quantity),
      });
      if (!res.ok) return setError(res.error);
      setName(""); setPrice("0"); setProcedureId(""); setQuantity("1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1.5fr_1fr_0.6fr_auto]">
      {procedures.length > 0 && (
        <div className="space-y-1 sm:col-span-4">
          <Label className="text-xs">From catalog (optional)</Label>
          <select className={selectClass} value={procedureId} onChange={(e) => onPick(e.target.value)}>
            <option value="">Custom procedure…</option>
            {procedures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <Input placeholder="Procedure name *" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Input type="number" step="0.01" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Add"}</Button>
      {error && <p className="text-xs text-[var(--destructive)] sm:col-span-4">{error}</p>}
    </form>
  );
}
