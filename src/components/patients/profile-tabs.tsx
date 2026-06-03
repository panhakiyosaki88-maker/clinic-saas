"use client";

import * as React from "react";

export interface ProfileTab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

/**
 * Lightweight tab switcher for the patient detail page. Server-rendered panels
 * are passed in as `content` nodes; this client component only toggles which is
 * visible, so the heavy data fetching stays on the server.
 */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = React.useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-[var(--border)]"
      >
        {tabs.map((t) => {
          const selected = t.id === current?.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={
                "relative -mb-px rounded-t-md px-3 py-2 text-sm font-medium transition-colors " +
                (selected
                  ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")
              }
            >
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className="ml-1.5 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-xs tabular-nums text-[var(--muted-foreground)]">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
