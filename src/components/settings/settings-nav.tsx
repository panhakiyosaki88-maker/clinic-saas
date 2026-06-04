"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Sub-nav shown on every Settings *section* page (not the hub itself) so users
 * can jump between sections without going back to the landing page. Hides
 * itself on the /settings hub, which already presents the sections as cards.
 */
export function SettingsNav({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  if (pathname === "/settings") return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 text-sm">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" /> All settings
        </Link>
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white"
                  : "rounded-lg px-3 py-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
