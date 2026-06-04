"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download } from "lucide-react";
import { deleteLabCategory, seedLabPanelCategories } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";

/** Deletes a group (cascades to its subgroups) or a single subgroup. */
export function DeleteCategoryButton({
  id,
  name,
  isGroup,
}: {
  id: string;
  name: string;
  isGroup?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const msg = isGroup
      ? `Delete the group “${name}” and all of its subgroups?`
      : `Delete “${name}”?`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      await deleteLabCategory(id);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
      disabled={pending}
      onClick={onClick}
      aria-label={`Delete ${name}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

/** Imports the standard requisition-sheet panel as groups + subgroups. */
export function ImportPanelButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  function onClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await seedLabPanelCategories();
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(res.data.created > 0 ? `Imported ${res.data.created} categories.` : "Already up to date.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClick}>
        <Download className="h-4 w-4" /> {pending ? "Importing…" : "Import standard panel"}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </div>
  );
}
