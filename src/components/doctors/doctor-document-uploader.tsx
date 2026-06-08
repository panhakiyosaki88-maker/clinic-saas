"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { recordDoctorDocument } from "@/server/actions/doctors";
import { Button } from "@/components/ui/button";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function DoctorDocumentUploader({
  clinicId,
  doctorId,
}: {
  clinicId: string;
  doctorId: string;
}) {
  const router = useRouter();
  const t = useTranslations("doctors.documents");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const path = `${clinicId}/${doctorId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("doctor-documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const result = await recordDoctorDocument({
        doctorId,
        filePath: path,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
        category: (category || undefined) as never,
      });
      if (!result.ok) {
        await supabase.storage.from("doctor-documents").remove([path]);
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        disabled={busy}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label={t("ariaCategory")}
      >
        <option value="">{t("categoryNone")}</option>
        <option value="license">{t("category.license")}</option>
        <option value="certificate">{t("category.certificate")}</option>
        <option value="cv">{t("category.cv")}</option>
        <option value="id">{t("category.id")}</option>
        <option value="other">{t("category.other")}</option>
      </select>
      <input ref={inputRef} type="file" className="hidden" onChange={onChange} disabled={busy} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? t("uploading") : t("upload")}
      </Button>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
