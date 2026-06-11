"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setClinicLogo } from "@/server/actions/clinic";
import { clinicLogoUrl } from "@/lib/clinic-logo";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from "@/lib/uploads";
import { ImageCropper } from "@/components/ui/image-cropper";
import { Button } from "@/components/ui/button";

export function ClinicLogoUploader({
  clinicId,
  logoPath,
}: {
  clinicId: string;
  logoPath: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("settings.logoUploader");
  const tc = useTranslations("common");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editSrc, setEditSrc] = React.useState<string | null>(null);

  const url = clinicLogoUrl(logoPath);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError(t("chooseImage"));
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(tc("fileTooLarge", { max: MAX_IMAGE_UPLOAD_MB }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onConfirm(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const path = `${clinicId}/${crypto.randomUUID()}.png`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("clinic-logos")
        .upload(path, blob, { upsert: false, contentType: "image/png" });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const result = await setClinicLogo(path);
      if (!result.ok) {
        await supabase.storage.from("clinic-logos").remove([path]);
        setError(result.error);
        return;
      }
      setEditSrc(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      const result = await setClinicLogo(null);
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
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={t("alt")} className="size-full object-contain" />
        ) : (
          <Building2 className="size-7 text-slate-400" />
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
            {busy ? t("uploading") : url ? t("changeLogo") : t("uploadLogo")}
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
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>

      {editSrc && (
        <ImageCropper
          src={editSrc}
          aspect={1}
          cropShape="rect"
          maxSize={512}
          busy={busy}
          onCancel={() => setEditSrc(null)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
