"use client";

import * as React from "react";

/** Ticking wall-clock for the hero band. Renders nothing until mounted to avoid
 *  a server/client hydration mismatch on the time string. */
export function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
    </span>
  );
}
