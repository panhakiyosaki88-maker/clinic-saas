"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { deletePatientDocument } from "@/server/actions/patients";
import type { PatientDocumentWithUrl } from "@/lib/db/queries/patients";
import { Button } from "@/components/ui/button";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export function DocumentList({
  documents,
  patientId,
  canWrite,
}: {
  documents: PatientDocumentWithUrl[];
  patientId: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  if (documents.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No documents yet.</p>;
  }

  function onDelete(id: string) {
    setPendingId(id);
    deletePatientDocument(id, patientId).finally(() => {
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-[var(--muted-foreground)]" />
            <div className="min-w-0">
              {d.signedUrl ? (
                <a
                  href={d.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {d.file_name}
                </a>
              ) : (
                <span className="truncate text-sm font-medium">{d.file_name}</span>
              )}
              <p className="text-xs text-[var(--muted-foreground)]">
                {d.category && (
                  <span className="mr-1.5 rounded-full bg-[var(--muted)] px-1.5 py-0.5 capitalize">
                    {d.category.replace("_", " ")}
                  </span>
                )}
                {formatSize(d.size_bytes)}
              </p>
            </div>
          </div>
          {canWrite && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pendingId === d.id}
              onClick={() => onDelete(d.id)}
            >
              Remove
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
