"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { addLabResult } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * Single result upload for a patient: uploads one report file and attaches it
 * to every (non-cancelled) lab request the patient has.
 */
export function PatientLabUpload({
  clinicId,
  patientId,
  requestIds,
}: {
  clinicId: string;
  patientId: string;
  requestIds: string[];
}) {
  const router = useRouter();
  const t = useTranslations("lab.upload");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const form = e.currentTarget;
    const file = (new FormData(form).get("file") as File) || null;
    if (!file || file.size === 0) {
      setError(t("chooseFile"));
      return;
    }
    if (requestIds.length === 0) {
      setError(t("noActiveTests"));
      return;
    }

    setPending(true);
    try {
      const path = `${clinicId}/${patientId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("lab-results")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        return;
      }

      for (const id of requestIds) {
        const res = await addLabResult({ requestId: id, filePath: path, fileName: file.name });
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }

      form.reset();
      setDone(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input name="file" type="file" />
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("uploaded")}</p>}
      <Button type="submit" disabled={pending}>{pending ? t("uploading") : t("upload")}</Button>
    </form>
  );
}
