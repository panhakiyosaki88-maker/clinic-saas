"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * A breadcrumb-style "back" control. Goes one step back in history (where the
 * user actually came from) and only falls back to `fallback` on a cold load with
 * no in-app history. Styled to match the old `<Link>` breadcrumbs it replaces.
 */
export function BackLink({ label, fallback }: { label: string; fallback: string }) {
  const router = useRouter();
  function onClick() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <button type="button" onClick={onClick} className="text-sm text-[var(--muted-foreground)] hover:underline">
      {label}
    </button>
  );
}
