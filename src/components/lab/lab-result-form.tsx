"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addLabResult } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function LabResultForm({
  clinicId,
  requestId,
}: {
  clinicId: string;
  requestId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = (f.get("file") as File) || null;

    try {
      let filePath: string | undefined;
      let fileName: string | undefined;
      if (file && file.size > 0) {
        const path = `${clinicId}/${requestId}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("lab-results")
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) {
          setError(upErr.message);
          return;
        }
        filePath = path;
        fileName = file.name;
      }

      const result = await addLabResult({
        requestId,
        resultValue: String(f.get("resultValue") ?? ""),
        unit: String(f.get("unit") ?? ""),
        referenceRange: String(f.get("referenceRange") ?? ""),
        resultText: String(f.get("resultText") ?? ""),
        filePath,
        fileName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="resultValue" className="text-xs">Value</Label>
          <Input id="resultValue" name="resultValue" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unit" className="text-xs">Unit</Label>
          <Input id="unit" name="unit" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="referenceRange" className="text-xs">Reference range</Label>
          <Input id="referenceRange" name="referenceRange" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="resultText" className="text-xs">Interpretation / notes</Label>
        <Textarea id="resultText" name="resultText" className="min-h-[56px]" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="file" className="text-xs">Report file (optional)</Label>
        <Input id="file" name="file" type="file" />
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Add result"}</Button>
    </form>
  );
}
