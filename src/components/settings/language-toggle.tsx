"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setUserLocale } from "@/i18n/locale";
import { locales, localeNames, localeShort, type Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";

/**
 * Compact top-bar language switch. Cycles to the next supported locale, so it
 * stays a one-tap toggle while we only ship English + Khmer.
 */
export function LanguageToggle() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const next = locales[(locales.indexOf(current) + 1) % locales.length];

  function toggle() {
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch language to ${localeNames[next]}`}
      title={localeNames[next]}
      disabled={pending}
      onClick={toggle}
      className="relative"
    >
      <Languages />
      <span className="absolute -bottom-0.5 right-0 rounded bg-[var(--background)] px-0.5 text-[9px] font-semibold leading-none">
        {localeShort[current]}
      </span>
    </Button>
  );
}
