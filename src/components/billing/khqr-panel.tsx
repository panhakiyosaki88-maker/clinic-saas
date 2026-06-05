"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { recordPayment } from "@/server/actions/billing";
import { formatUSD, formatKHR, usdToKhr } from "@/lib/billing/currency";
import { Button } from "@/components/ui/button";

/**
 * Shows a generated KHQR for an invoice and a manual "mark as paid" action.
 * (Automatic confirmation would require the Bakong API.)
 */
export function KhqrPanel({
  invoiceId,
  payload,
  amount,
  reference,
  currency,
  rate = 4100,
}: {
  invoiceId: string;
  payload: string;
  /** USD balance — what gets recorded as the payment. */
  amount: number;
  reference: string;
  currency: string;
  rate?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [src, setSrc] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(payload, { width: 240, margin: 1 }).then(setSrc).catch(() => setError("Could not render QR."));
  }, [open, payload]);

  if (!open) {
    return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Show KHQR</Button>;
  }

  return (
    <div className="rounded-md border border-[var(--border)] p-4 text-center">
      <p className="text-sm font-medium">Scan to pay</p>
      <p className="text-xs text-[var(--muted-foreground)]">
        {reference} · {currency === "KHR" ? formatKHR(usdToKhr(amount, rate)) : formatUSD(amount)}
      </p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated QR data URL, not a static asset
        <img src={src} alt="KHQR" className="mx-auto my-3 h-60 w-60" />
      ) : (
        <div className="mx-auto my-3 h-60 w-60 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      )}
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <div className="flex justify-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await recordPayment({ invoiceId, amount, method: "khqr", reference });
              if (!res.ok) return setError(res.error);
              setOpen(false);
              router.refresh();
            })
          }
        >
          {pending ? "Marking…" : "Mark as paid"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Close</Button>
      </div>
    </div>
  );
}
