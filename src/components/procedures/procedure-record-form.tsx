"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveProcedureRecord } from "@/server/actions/procedures";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Capture the clinical record (notes + outcome) for a procedure order. */
export function ProcedureRecordForm({
  orderId,
  initial,
}: {
  orderId: string;
  initial: { clinical_notes: string | null; outcome: string | null } | null;
}) {
  const router = useRouter();
  const t = useTranslations("procedures.record");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setPending(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await saveProcedureRecord({
        orderId,
        clinicalNotes: String(f.get("clinicalNotes") ?? ""),
        outcome: String(f.get("outcome") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${orderId}`}>{t("clinicalNotes")}</Label>
        <Textarea id={`notes-${orderId}`} name="clinicalNotes" defaultValue={initial?.clinical_notes ?? ""} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`outcome-${orderId}`}>{t("outcome")}</Label>
        <Textarea id={`outcome-${orderId}`} name="outcome" defaultValue={initial?.outcome ?? ""} rows={2} />
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("saved")}</p>}
      <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
    </form>
  );
}
