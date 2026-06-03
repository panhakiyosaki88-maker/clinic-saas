"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createAndAssignTag, unassignTag } from "@/server/actions/patients";
import type { PatientTag } from "@/lib/db/queries/patients";

export function PatientTags({
  patientId,
  tags,
  clinicTags,
  canWrite,
}: {
  patientId: string;
  tags: PatientTag[];
  clinicTags: PatientTag[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const assigned = new Set(tags.map((t) => t.id));
  const suggestions = clinicTags.filter((t) => !assigned.has(t.id));

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createAndAssignTag(patientId, { name: trimmed });
      setAdding(false);
      router.refresh();
    });
  }

  function remove(tagId: string) {
    startTransition(async () => {
      await unassignTag(patientId, tagId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]"
          style={t.color ? { backgroundColor: `${t.color}22`, color: t.color } : undefined}
        >
          {t.name}
          {canWrite && (
            <button
              type="button"
              aria-label={`Remove ${t.name}`}
              disabled={pending}
              onClick={() => remove(t.id)}
              className="opacity-60 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}

      {canWrite &&
        (adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              ref={inputRef}
              list="clinic-tags"
              placeholder="Tag…"
              disabled={pending}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add((e.target as HTMLInputElement).value);
                } else if (e.key === "Escape") {
                  setAdding(false);
                }
              }}
              className="h-7 w-28 rounded-full border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <datalist id="clinic-tags">
              {suggestions.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            <button
              type="button"
              disabled={pending}
              onClick={() => add(inputRef.current?.value ?? "")}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Add
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            + Tag
          </button>
        ))}
    </div>
  );
}
