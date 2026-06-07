"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setUserLocale } from "@/i18n/locale";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full max-w-xs rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export function LanguageSwitcher() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="locale">{localeNames[current]}</Label>
      <select
        id="locale"
        className={selectClass}
        defaultValue={current}
        onChange={onChange}
        disabled={pending}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
