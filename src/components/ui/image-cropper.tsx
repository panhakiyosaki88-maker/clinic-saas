"use client";

import * as React from "react";
import Cropper from "react-easy-crop";
import { useTranslations } from "next-intl";
import { croppedImageBlob, type PixelArea } from "@/lib/image-crop";
import { Button } from "@/components/ui/button";

/**
 * Modal image editor: drag to move, slide/scroll to zoom, fixed crop frame.
 * Returns the cropped region as a PNG blob via `onConfirm`.
 */
export function ImageCropper({
  src,
  aspect = 1,
  cropShape = "rect",
  maxSize = 512,
  busy = false,
  onCancel,
  onConfirm,
}: {
  src: string;
  aspect?: number;
  cropShape?: "rect" | "round";
  maxSize?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const t = useTranslations("imageCropper");
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<PixelArea | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onCropComplete = React.useCallback((_: unknown, pixels: PixelArea) => {
    setArea(pixels);
  }, []);

  async function apply() {
    if (!area) return;
    setError(null);
    try {
      const blob = await croppedImageBlob(src, area, maxSize);
      onConfirm(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div className="w-full max-w-md space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-xl">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("title")}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{t("hint")}</p>
        </div>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-slate-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === "rect"}
            minZoom={1}
            maxZoom={4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">{t("zoom")}</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={t("zoom")}
            className="h-1.5 flex-1 cursor-pointer accent-brand-600"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setZoom(1);
              setCrop({ x: 0, y: 0 });
            }}
          >
            {t("reset")}
          </Button>
        </div>

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="button" size="sm" disabled={busy || !area} onClick={apply}>
            {busy ? t("applying") : t("apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
