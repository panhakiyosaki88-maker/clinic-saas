"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteMedicalRecord } from "@/server/actions/medical-records";
import { Button } from "@/components/ui/button";

export function DeleteRecordButton({
  recordId,
  patientId,
}: {
  recordId: string;
  patientId: string;
}) {
  const router = useRouter();
  const t = useTranslations("records.recordDetail");
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        {t("delete")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted-foreground)]">{t("sure")}</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteMedicalRecord(recordId, patientId);
            if (result.ok) {
              router.refresh();
              router.push(`/patients/${patientId}`);
            }
          })
        }
      >
        {pending ? t("deleting") : t("confirm")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        {t("cancel")}
      </Button>
    </div>
  );
}
