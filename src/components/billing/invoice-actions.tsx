"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { duplicateInvoice, finalizeInvoice } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";

/** Duplicate-as-draft and (for drafts) finalize/issue actions for an invoice. */
export function InvoiceActions({ invoiceId, isDraft }: { invoiceId: string; isDraft: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      {isDraft && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await finalizeInvoice(invoiceId);
              if (res.ok) router.refresh();
            })
          }
        >
          {pending ? "…" : "Finalize"}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await duplicateInvoice(invoiceId);
            if (res.ok) router.push(`/billing/${(res.data as { invoiceId: string }).invoiceId}`);
          })
        }
      >
        Duplicate
      </Button>
    </>
  );
}
