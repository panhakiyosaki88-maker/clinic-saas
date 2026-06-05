"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { setActiveBranch } from "@/server/actions/branch";

export interface BranchOption {
  id: string;
  name: string;
}

/**
 * Header dropdown that sets the active branch (or "All branches") for the
 * whole dashboard. Rendered only when the clinic has more than one branch.
 */
export function BranchSwitcher({
  branches,
  activeId,
}: {
  branches: BranchOption[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const active = branches.find((b) => b.id === activeId);
  const label = active?.name ?? "All branches";

  function choose(id: string | null) {
    setOpen(false);
    if (id === activeId) return;
    startTransition(async () => {
      await setActiveBranch(id);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Building2 className="size-4 text-slate-400" />
        <span className="max-w-[8rem] truncate">{label}</span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <BranchRow
              label="All branches"
              selected={activeId === null}
              onClick={() => choose(null)}
            />
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            {branches.map((b) => (
              <BranchRow
                key={b.id}
                label={b.name}
                selected={b.id === activeId}
                onClick={() => choose(b.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BranchRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="size-4 shrink-0 text-brand-600" />}
    </button>
  );
}
