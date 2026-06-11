"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { saveImagingResult, addImagingFile } from "@/server/actions/imaging";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploads";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** Capture findings / impression / report and (optionally) upload a scan file. */
export function ImagingResultForm({
  clinicId,
  requestId,
  initial,
}: {
  clinicId: string;
  requestId: string;
  initial: { findings: string | null; impression: string | null; report_text: string | null } | null;
}) {
  const router = useRouter();
  const t = useTranslations("imaging.result");
  const tc = useTranslations("common");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setPending(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const res = await saveImagingResult({
        requestId,
        findings: String(f.get("findings") ?? ""),
        impression: String(f.get("impression") ?? ""),
        reportText: String(f.get("reportText") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }

      const file = (f.get("file") as File) || null;
      if (file && file.size > 0) {
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(tc("fileTooLarge", { max: MAX_UPLOAD_MB }));
          return;
        }
        const path = `${clinicId}/${requestId}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("imaging-files")
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) {
          setError(upErr.message);
          return;
        }
        const fileRes = await addImagingFile({ requestId, filePath: path, fileName: file.name });
        if (!fileRes.ok) {
          setError(fileRes.error);
          return;
        }
      }

      setDone(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`findings-${requestId}`}>{t("findings")}</Label>
        <Textarea id={`findings-${requestId}`} name="findings" defaultValue={initial?.findings ?? ""} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`impression-${requestId}`}>{t("impression")}</Label>
        <Textarea id={`impression-${requestId}`} name="impression" defaultValue={initial?.impression ?? ""} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`report-${requestId}`}>{t("report")}</Label>
        <Textarea id={`report-${requestId}`} name="reportText" defaultValue={initial?.report_text ?? ""} rows={4} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`file-${requestId}`}>{t("attachFile")}</Label>
        <Input id={`file-${requestId}`} name="file" type="file" />
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("saved")}</p>}
      <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
    </form>
  );
}
