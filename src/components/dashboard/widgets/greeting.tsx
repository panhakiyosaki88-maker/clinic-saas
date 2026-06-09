"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

/** Time-of-day greeting based on the *browser's* local hour. */
export function periodForHour(h: number): GreetingPeriod {
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

/**
 * Role-aware greeting line. Renders the server-computed period for the initial
 * paint (no flash), then corrects to the viewer's local time of day on mount so
 * it always matches their actual clock rather than the server's timezone.
 */
export function Greeting({ name, initialPeriod }: { name: string; initialPeriod: GreetingPeriod }) {
  const t = useTranslations("dashboard.hero");
  const [period, setPeriod] = React.useState<GreetingPeriod>(initialPeriod);

  React.useEffect(() => {
    setPeriod(periodForHour(new Date().getHours()));
  }, []);

  return (
    <h1 className="text-xl font-bold leading-tight" suppressHydrationWarning>
      {t(period)}, {name}
    </h1>
  );
}
