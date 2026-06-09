"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACCENT_COOKIE,
  ACCENT_CUSTOM_COOKIE,
  ACCENT_SHADES,
  customBrandVars,
} from "@/lib/accent";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Persist (or clear) an accent value in a cookie so the server can render it
 *  on <html> on the next load — this is what kills the first-paint color flash. */
function writeAccentCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* ignore */
  }
}
function clearAccentCookie(name: string) {
  try {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  } catch {
    /* ignore */
  }
}

/** UI "tone" presets. `blue` is the default (no data-accent attribute). */
const ACCENTS = [
  { id: "blue", label: "Blue", swatch: "bg-blue-500" },
  { id: "violet", label: "Violet", swatch: "bg-violet-500" },
  { id: "emerald", label: "Emerald", swatch: "bg-emerald-500" },
  { id: "teal", label: "Teal", swatch: "bg-teal-500" },
  { id: "amber", label: "Amber", swatch: "bg-amber-500" },
  { id: "rose", label: "Rose", swatch: "bg-rose-500" },
] as const;

type AccentId = (typeof ACCENTS)[number]["id"] | "custom";

export const ACCENT_STORAGE_KEY = "ui-accent";
export const ACCENT_CUSTOM_KEY = "ui-accent-custom";
const DEFAULT_CUSTOM = "#2563eb";

function setCustomVars(hex: string) {
  const el = document.documentElement;
  const vars = customBrandVars(hex);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  el.setAttribute("data-accent", "custom");
}

function clearCustomVars() {
  const el = document.documentElement;
  for (const [k] of ACCENT_SHADES) el.style.removeProperty(`--brand-${k}`);
}

/** Applies a preset accent to <html> and persists it (cookie + localStorage). */
export function applyAccent(id: Exclude<AccentId, "custom">) {
  clearCustomVars();
  clearAccentCookie(ACCENT_CUSTOM_COOKIE);
  if (id === "blue") {
    document.documentElement.removeAttribute("data-accent");
    clearAccentCookie(ACCENT_COOKIE);
  } else {
    document.documentElement.setAttribute("data-accent", id);
    writeAccentCookie(ACCENT_COOKIE, id);
  }
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {
    /* private mode — ignore */
  }
}

/** Applies a freely-chosen color and persists it (cookie + localStorage). */
export function applyCustom(hex: string) {
  setCustomVars(hex);
  writeAccentCookie(ACCENT_COOKIE, "custom");
  writeAccentCookie(ACCENT_CUSTOM_COOKIE, hex);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, "custom");
    localStorage.setItem(ACCENT_CUSTOM_KEY, hex);
  } catch {
    /* ignore */
  }
}

/**
 * Lets the user recolor the whole UI ("tone"). Sits next to the light/dark
 * toggle. Six presets plus a custom color picker; switching the `--brand-*`
 * scale recolors everything instantly.
 */
export function AccentToggle() {
  const [open, setOpen] = React.useState(false);
  const [accent, setAccent] = React.useState<AccentId>("blue");
  const [customHex, setCustomHex] = React.useState(DEFAULT_CUSTOM);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentId | null;
      const savedHex = localStorage.getItem(ACCENT_CUSTOM_KEY);
      if (savedHex) setCustomHex(savedHex);
      if (saved === "custom" || ACCENTS.some((a) => a.id === saved)) {
        setAccent(saved as AccentId);
      }
      // Mirror an existing localStorage accent into the cookie so the server can
      // render it on the next load (migrates users who set it before cookies).
      if (saved === "custom" && savedHex) {
        writeAccentCookie(ACCENT_COOKIE, "custom");
        writeAccentCookie(ACCENT_CUSTOM_COOKIE, savedHex);
      } else if (saved && saved !== "blue") {
        writeAccentCookie(ACCENT_COOKIE, saved);
      }
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

  const choosePreset = (id: Exclude<AccentId, "custom">) => {
    setAccent(id);
    applyAccent(id);
    setOpen(false);
  };

  const chooseCustom = (hex: string) => {
    setCustomHex(hex);
    setAccent("custom");
    applyCustom(hex);
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
              onClick={() => choosePreset(a.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className={`size-4 rounded-full ring-1 ring-black/10 ${a.swatch}`} />
              <span className="flex-1 text-left">{a.label}</span>
              {accent === a.id && <Check className="size-4 text-slate-500" />}
            </button>
          ))}

          <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              <span
                className="size-4 rounded-full ring-1 ring-black/10"
                style={{ background: customHex }}
              />
              <span className="flex-1 text-left">Custom</span>
              {accent === "custom" && <Check className="size-4 text-slate-500" />}
              <input
                type="color"
                value={customHex}
                onChange={(e) => chooseCustom(e.target.value)}
                className="sr-only"
                aria-label="Pick a custom color"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
