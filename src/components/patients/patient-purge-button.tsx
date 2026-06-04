"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { purgePatient } from "@/server/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Permanently deletes a single patient and all their data. Guarded by a modal
 * that requires retyping the patient's full name — this is irreversible and
 * also wipes their uploaded files from Storage.
 */
export function PatientPurgeButton({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const matches = typed.trim() === patientName.trim();

  function close() {
    if (pending) return;
    setOpen(false);
    setTyped("");
    setError(null);
  }

  function onConfirm() {
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      const res = await purgePatient(patientId, typed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setTyped("");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${patientName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--destructive)]">Delete patient permanently</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              This permanently deletes <span className="font-medium text-[var(--foreground)]">{patientName}</span> and
              everything linked to them — visits, prescriptions, lab work, and all uploaded
              documents and files. This cannot be undone.
            </p>
            <p className="mt-3 text-sm">
              Type <span className="font-semibold">{patientName}</span> to confirm:
            </p>
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Patient's full name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches) onConfirm();
              }}
            />
            {error && <p className="mt-2 text-sm text-[var(--destructive)]">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onConfirm}
                disabled={!matches || pending}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
