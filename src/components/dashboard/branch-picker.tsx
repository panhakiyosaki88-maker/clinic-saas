"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Check } from "lucide-react";
import { setActiveBranch } from "@/server/actions/branch";
import type { BranchOption } from "@/components/dashboard/branch-switcher";

/**
 * Blocking, first-entry modal that makes the user pick a working branch before
 * using the app. Shown only when the clinic has more than one branch and no
 * branch has been chosen yet (see the dashboard layout). The choice is stored in
 * the active-branch cookie and drives both the data shown and the branch new
 * records are saved to. Non-dismissable — there is no close button and the
 * backdrop does not dismiss; the user must choose an option.
 */
export function BranchPicker({ branches }: { branches: BranchOption[] }) {
  const router = useRouter();
  const t = useTranslations("shell");
  const [pending, setPending] = React.useState<string | null>(null);

  function choose(id: string | null) {
    setPending(id ?? "all");
    React.startTransition(async () => {
      await setActiveBranch(id);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("chooseBranchTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("chooseBranchSubtitle")}
            </p>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto p-3">
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={pending !== null}
              onClick={() => choose(b.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
            >
              <span className="truncate">{b.name}</span>
              {pending === b.id && <Check className="size-4 shrink-0 text-brand-600" />}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => choose(null)}
            className="w-full rounded-lg px-4 py-2 text-center text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {t("chooseBranchAllHint")}
          </button>
        </div>
      </div>
    </div>
  );
}
