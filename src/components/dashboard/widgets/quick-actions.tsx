"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, UserPlus, FileText, ReceiptText, FlaskConical, Footprints, type LucideIcon } from "lucide-react";

export interface QuickActionFlags {
  appointment: boolean;
  patient: boolean;
  prescription: boolean;
  invoice: boolean;
  lab: boolean;
}

interface Action {
  key: keyof QuickActionFlags;
  label: string;
  href: string;
  icon: LucideIcon;
  tint: string;
  shortcut: string; // single key
}

const ALL: Action[] = [
  { key: "patient", label: "Register Patient", href: "/patients/new", icon: UserPlus, tint: "text-emerald-600 dark:text-emerald-400", shortcut: "p" },
  { key: "appointment", label: "Book Appointment", href: "/appointments/new", icon: CalendarPlus, tint: "text-blue-600 dark:text-blue-400", shortcut: "a" },
  { key: "appointment", label: "Walk-in", href: "/appointments/new?walkin=1", icon: Footprints, tint: "text-sky-600 dark:text-sky-400", shortcut: "w" },
  { key: "invoice", label: "Create Invoice", href: "/billing/new", icon: ReceiptText, tint: "text-violet-600 dark:text-violet-400", shortcut: "i" },
  { key: "prescription", label: "New Prescription", href: "/prescriptions/new", icon: FileText, tint: "text-amber-600 dark:text-amber-400", shortcut: "r" },
  { key: "lab", label: "New Lab Request", href: "/lab/new", icon: FlaskConical, tint: "text-rose-600 dark:text-rose-400", shortcut: "l" },
];

/** Role-tailored quick actions with single-key keyboard shortcuts. */
export function QuickActions({ flags }: { flags: QuickActionFlags }) {
  const router = useRouter();
  const items = React.useMemo(() => ALL.filter((a) => flags[a.key]), [flags]);

  React.useEffect(() => {
    if (items.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      const hit = items.find((a) => a.shortcut === e.key.toLowerCase());
      if (hit) {
        e.preventDefault();
        router.push(hit.href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, router]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          title={`Shortcut: ${a.shortcut.toUpperCase()}`}
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
        >
          <a.icon className={`size-4 ${a.tint}`} />
          {a.label}
          <kbd className="ml-1 hidden rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-semibold uppercase text-slate-400 group-hover:inline dark:border-slate-700 dark:bg-slate-800">
            {a.shortcut}
          </kbd>
        </Link>
      ))}
    </div>
  );
}
