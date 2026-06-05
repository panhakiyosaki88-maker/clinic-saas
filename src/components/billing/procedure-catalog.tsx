"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createProcedure, deleteProcedure } from "@/server/actions/procedures";
import type { Procedure } from "@/lib/db/queries/procedures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUSD } from "@/lib/billing/currency";

const money = (n: number) => formatUSD(n);

export function ProcedureCatalog({ procedures }: { procedures: Procedure[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await createProcedure({
        name: String(f.get("name") ?? ""),
        code: String(f.get("code") ?? ""),
        defaultPrice: Number(f.get("defaultPrice") ?? 0),
        description: String(f.get("description") ?? ""),
      });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteProcedure(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Procedure name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="code" className="text-xs">Code (optional)</Label>
          <Input id="code" name="code" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultPrice" className="text-xs">Default price</Label>
          <Input id="defaultPrice" name="defaultPrice" type="number" step="0.01" defaultValue={0} />
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor="description" className="text-xs">Description (optional)</Label>
          <Input id="description" name="description" />
        </div>
        {error && <p className="text-xs text-[var(--destructive)] sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3">
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Add procedure"}</Button>
        </div>
      </form>

      {procedures.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No procedures yet. Add one above.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <tr><th className="pb-2">Name</th><th className="pb-2">Code</th><th className="pb-2 text-right">Price</th><th /></tr>
          </thead>
          <tbody>
            {procedures.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-medium">{p.name}{!p.is_active && <span className="ml-2 text-xs text-[var(--muted-foreground)]">(inactive)</span>}</td>
                <td className="py-2">{p.code ?? "—"}</td>
                <td className="py-2 text-right tabular-nums">{money(Number(p.default_price))}</td>
                <td className="py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(p.id)} disabled={pending}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
