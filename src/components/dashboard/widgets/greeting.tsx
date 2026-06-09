"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

/** Time-of-day greeting bucket from a 24h hour. */
function periodForHour(h: number): GreetingPeriod {
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

/**
 * Role-aware greeting line, computed from the *browser's* local hour so it always
 * matches the viewer's actual time of day rather than the server timezone. The
 * useState initializer renders a value for SSR (no flash); useEffect re-syncs to
 * the real client clock on mount. suppressHydrationWarning silences the expected
 * server/client text difference (same approach as LiveClock).
 */
export function Greeting({ name }: { name: string }) {
  const t = useTranslations("dashboard.hero");
  const [period, setPeriod] = React.useState<GreetingPeriod>(() => periodForHour(new Date().getHours()));

  React.useEffect(() => {
    setPeriod(periodForHour(new Date().getHours()));
  }, []);

  return (
    <h1 className="text-xl font-bold leading-tight" suppressHydrationWarning>
      {t(period)}, {name}
    </h1>
  );
}
