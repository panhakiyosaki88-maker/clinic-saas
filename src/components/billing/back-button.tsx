"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** Goes one step back in history (where the user actually came from), falling
 *  back to /billing on a cold load with no history. */
export function BackButton({ label = "← Back" }: { label?: string }) {
  const router = useRouter();
  function onClick() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/billing");
  }
  return (
    <button type="button" onClick={onClick} className="text-sm text-[var(--muted-foreground)] hover:underline">
      {label}
    </button>
  );
}
