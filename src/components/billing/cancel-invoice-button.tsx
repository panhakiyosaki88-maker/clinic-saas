"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cancelInvoice } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const t = useTranslations("billing.invoiceDetail");
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="print:hidden" onClick={() => setConfirming(true)}>
        {t("void")}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2 print:hidden">
      <span className="text-sm text-[var(--muted-foreground)]">{t("voidConfirm")}</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelInvoice(invoiceId);
            if (result.ok) router.refresh();
          })
        }
      >
        {pending ? t("voiding") : t("confirm")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>{t("cancel")}</Button>
    </div>
  );
}
