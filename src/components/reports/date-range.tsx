"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRange({ from, to }: { from: string; to: string }) {
  const tr = useTranslations("reports.range");
  const router = useRouter();
  const [f, setF] = React.useState(from);
  const [t, setT] = React.useState(to);

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(`/reports?from=${f}&to=${t}`);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-2 print:hidden">
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs">{tr("from")}</Label>
        <Input id="from" type="date" value={f} onChange={(e) => setF(e.target.value)} className="w-40" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs">{tr("to")}</Label>
        <Input id="to" type="date" value={t} onChange={(e) => setT(e.target.value)} className="w-40" />
      </div>
      <Button type="submit" size="sm">{tr("apply")}</Button>
    </form>
  );
}
