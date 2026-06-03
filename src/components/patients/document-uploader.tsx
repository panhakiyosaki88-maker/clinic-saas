"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordPatientDocument } from "@/server/actions/patients";
import { Button } from "@/components/ui/button";

/** Sanitizes a filename for use in a storage object key. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function DocumentUploader({
  clinicId,
  patientId,
  medicalRecordId,
}: {
  clinicId: string;
  patientId: string;
  medicalRecordId?: string;
}) {
  const router = useRouter();
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
      const path = `${clinicId}/${patientId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("patient-documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        return;
      }

      const result = await recordPatientDocument({
        patientId,
        medicalRecordId,
        filePath: path,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
        category: (category || undefined) as never,
      });
      if (!result.ok) {
        // Roll back the orphaned upload.
        await supabase.storage.from("patient-documents").remove([path]);
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
        aria-label="Document category"
      >
        <option value="">Category…</option>
        <option value="scan">Scan</option>
        <option value="report">Report</option>
        <option value="x_ray">X-ray</option>
        <option value="consent">Consent</option>
        <option value="insurance">Insurance</option>
        <option value="other">Other</option>
      </select>
      <input ref={inputRef} type="file" className="hidden" onChange={onChange} disabled={busy} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Uploading…" : "Upload document"}
      </Button>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
