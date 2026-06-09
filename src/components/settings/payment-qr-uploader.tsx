"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { createClient } from "@/lib/supabase/client";
import { setBranchPaymentQr, setBranchPaymentQrCaption } from "@/server/actions/clinic";
import { paymentQrUrl } from "@/lib/payment-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Crops the displayed image to the selected region and returns a PNG blob. */
async function croppedPngBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pxW = Math.max(1, Math.round(crop.width * scaleX));
  const pxH = Math.max(1, Math.round(crop.height * scaleY));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, pxW, pxH, 0, 0, pxW, pxH);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not crop image."))), "image/png")
  );
}

export function PaymentQrUploader({
  clinicId,
  branchId,
  qrPath,
  caption,
}: {
  clinicId: string;
  branchId: string;
  qrPath: string | null;
  caption: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("settings.qrUploader");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Crop workflow state: a picked file becomes a data URL shown in the cropper.
  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();

  // Caption editing.
  const [captionText, setCaptionText] = React.useState(caption ?? "");
  const [savingCaption, setSavingCaption] = React.useState(false);
  const [captionSaved, setCaptionSaved] = React.useState(false);

  const url = paymentQrUrl(qrPath);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t("chooseImage"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("maxSize"));
      return;
    }
    setCrop(undefined);
    setCompletedCrop(undefined);
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function cancelCrop() {
    setImgSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  async function confirmUpload() {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0) {
      setError(t("dragSelect"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await croppedPngBlob(imgRef.current, completedCrop);
      const path = `${clinicId}/${branchId}/${crypto.randomUUID()}.png`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("payment-qrs")
        .upload(path, blob, { upsert: false, contentType: "image/png" });
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
      cancelCrop();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("couldNotUpload"));
    } finally {
      setBusy(false);
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

  function saveCaption() {
    setSavingCaption(true);
    setCaptionSaved(false);
    setError(null);
    void (async () => {
      try {
        const result = await setBranchPaymentQrCaption(branchId, captionText);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setCaptionSaved(true);
        router.refresh();
      } finally {
        setSavingCaption(false);
      }
    })();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={t("alt")} className="size-full object-contain" />
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
              onChange={onPick}
              disabled={busy}
            />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              {url ? t("changeQr") : t("uploadQr")}
            </Button>
            {url && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
                {t("remove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("hint")}
          </p>
        </div>
      </div>

      {/* Free-crop step (shown after a file is picked, before upload). */}
      {imgSrc && (
        <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("dragHint")}
          </p>
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={imgSrc} alt={t("cropAlt")} className="max-h-80 w-auto" />
          </ReactCrop>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={confirmUpload}>
              {busy ? t("uploading") : t("uploadCropped")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={cancelCrop}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Caption shown under the QR on the invoice. */}
      <div className="space-y-1">
        <Label htmlFor="qrCaption" className="text-xs">{t("captionLabel")}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="qrCaption"
            value={captionText}
            maxLength={120}
            placeholder={t("captionPlaceholder")}
            className="h-9 max-w-xs"
            onChange={(e) => {
              setCaptionText(e.target.value);
              setCaptionSaved(false);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={savingCaption || captionText === (caption ?? "")}
            onClick={saveCaption}
          >
            {savingCaption ? t("saving") : t("saveCaption")}
          </Button>
          {captionSaved && <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("saved")}</span>}
        </div>
      </div>

      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
