"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** UI "tone" presets. `blue` is the default (no data-accent attribute). */
const ACCENTS = [
  { id: "blue", label: "Blue", swatch: "bg-blue-500" },
  { id: "violet", label: "Violet", swatch: "bg-violet-500" },
  { id: "emerald", label: "Emerald", swatch: "bg-emerald-500" },
  { id: "teal", label: "Teal", swatch: "bg-teal-500" },
  { id: "amber", label: "Amber", swatch: "bg-amber-500" },
  { id: "rose", label: "Rose", swatch: "bg-rose-500" },
] as const;

type AccentId = (typeof ACCENTS)[number]["id"];
export const ACCENT_STORAGE_KEY = "ui-accent";

/** Applies an accent to <html> and persists it. */
export function applyAccent(id: AccentId) {
  if (id === "blue") document.documentElement.removeAttribute("data-accent");
  else document.documentElement.setAttribute("data-accent", id);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {
    /* private mode — ignore */
  }
}

/**
 * Lets the user recolor the whole UI ("tone"). Sits next to the light/dark
 * toggle. Recolors instantly by switching the `--brand-*` CSS scale.
 */
export function AccentToggle() {
  const [open, setOpen] = React.useState(false);
  const [accent, setAccent] = React.useState<AccentId>("blue");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentId | null;
      if (saved && ACCENTS.some((a) => a.id === saved)) setAccent(saved);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (id: AccentId) => {
    setAccent(id);
    applyAccent(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Change UI color tone"
        onClick={() => setOpen((o) => !o)}
      >
        <Palette />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-slate-400">UI tone</p>
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => choose(a.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className={`size-4 rounded-full ring-1 ring-black/10 ${a.swatch}`} />
              <span className="flex-1 text-left">{a.label}</span>
              {accent === a.id && <Check className="size-4 text-slate-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
