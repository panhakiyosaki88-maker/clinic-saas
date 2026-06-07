"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setBranchPaymentQr } from "@/server/actions/clinic";
import { paymentQrUrl } from "@/lib/payment-qr";
import { Button } from "@/components/ui/button";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export function PaymentQrUploader({
  clinicId,
  branchId,
  qrPath,
}: {
  clinicId: string;
  branchId: string;
  qrPath: string | null;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const url = paymentQrUrl(qrPath);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 2 MB or smaller.");
      return;
    }

    setBusy(true);
    try {
      const path = `${clinicId}/${branchId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("payment-qrs")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const result = await setBranchPaymentQr(branchId, path);
      if (!result.ok) {
        await supabase.storage.from("payment-qrs").remove([path]);
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      const result = await setBranchPaymentQr(branchId, null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Payment QR" className="size-full object-contain" />
        ) : (
          <QrCode className="size-8 text-slate-400" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChange}
            disabled={busy}
          />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : url ? "Change QR" : "Upload QR"}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          PNG, JPG or SVG up to 2 MB. Shown on invoices for this branch so patients can scan to pay.
        </p>
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    </div>
  );
}
