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

/** Use layout effect on the client (patches before paint, no flicker) but fall
 *  back to useEffect on the server where useLayoutEffect would warn. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Role-aware greeting line, computed from the *browser's* local hour so it always
 * matches the viewer's actual time of day rather than the server timezone.
 *
 * The initial state is `null` (deterministic, so SSR and the client's first
 * render agree), which renders a neutral "morning" fallback. On mount the effect
 * sets the real period — because it changes state away from `null`, React always
 * re-renders and patches the DOM, even where the server (often UTC) guessed a
 * different time of day. Without this, suppressHydrationWarning would freeze the
 * server's text on screen.
 */
export function Greeting({ name }: { name: string }) {
  const t = useTranslations("dashboard.hero");
  const [period, setPeriod] = React.useState<GreetingPeriod | null>(null);

  useIsomorphicLayoutEffect(() => {
    setPeriod(periodForHour(new Date().getHours()));
  }, []);

  return (
    <h1 className="text-xl font-bold leading-tight" suppressHydrationWarning>
      {t(period ?? "morning")}, {name}
    </h1>
  );
}
