"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setClinicLogo } from "@/server/actions/clinic";
import { clinicLogoUrl } from "@/lib/clinic-logo";
import { Button } from "@/components/ui/button";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export function ClinicLogoUploader({
  clinicId,
  logoPath,
}: {
  clinicId: string;
  logoPath: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("settings.logoUploader");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const url = clinicLogoUrl(logoPath);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    setBusy(true);
    try {
      const path = `${clinicId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("clinic-logos")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
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
            onChange={onChange}
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
    </div>
  );
}
