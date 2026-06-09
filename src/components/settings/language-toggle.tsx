"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { setUserLocale } from "@/i18n/locale";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { LocaleFlag } from "@/components/settings/flags";
import { Button } from "@/components/ui/button";

/**
 * Compact top-bar language switch. Cycles to the next supported locale, so it
 * stays a one-tap toggle while we only ship English + Khmer.
 */
export function LanguageToggle() {
  const current = useLocale() as Locale;
  const [pending, startTransition] = React.useTransition();

  const next = locales[(locales.indexOf(current) + 1) % locales.length];

  function toggle() {
    startTransition(async () => {
      await setUserLocale(next);
      // Full reload (not router.refresh) so the theme + accent that client JS
      // set on <html> survive — a partial RSC refresh strips them.
      window.location.reload();
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
    >
      <LocaleFlag locale={current} />
    </Button>
  );
}
