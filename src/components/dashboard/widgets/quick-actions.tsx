import Link from "next/link";
import { CalendarPlus, UserPlus, FileText, ReceiptText, FlaskConical, type LucideIcon } from "lucide-react";

export interface QuickActionFlags {
  appointment: boolean;
  patient: boolean;
  prescription: boolean;
  invoice: boolean;
  lab: boolean;
}

const ALL: { key: keyof QuickActionFlags; label: string; href: string; icon: LucideIcon; tint: string }[] = [
  { key: "appointment", label: "Book Appointment", href: "/appointments/new", icon: CalendarPlus, tint: "text-blue-600 dark:text-blue-400" },
  { key: "patient", label: "Register Patient", href: "/patients/new", icon: UserPlus, tint: "text-emerald-600 dark:text-emerald-400" },
  { key: "prescription", label: "New Prescription", href: "/prescriptions/new", icon: FileText, tint: "text-amber-600 dark:text-amber-400" },
  { key: "invoice", label: "Create Invoice", href: "/billing/new", icon: ReceiptText, tint: "text-violet-600 dark:text-violet-400" },
  { key: "lab", label: "New Lab Request", href: "/lab/new", icon: FlaskConical, tint: "text-rose-600 dark:text-rose-400" },
];

/** Role-tailored quick action chips (only the ones the user can perform). */
export function QuickActions({ flags }: { flags: QuickActionFlags }) {
  const items = ALL.filter((a) => flags[a.key]);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <Link
          key={a.key}
          href={a.href}
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
        >
          <a.icon className={`size-4 ${a.tint}`} />
          {a.label}
        </Link>
      ))}
    </div>
  );
}
