"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/billing", label: "Dashboard", exact: true },
  { href: "/billing/invoices", label: "Invoices" },
  { href: "/billing/payments", label: "Payments" },
  { href: "/billing/catalog", label: "Price catalog" },
];

/** Sub-navigation shared across the billing pages. */
export function BillingTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--border)]">
      {TABS.map((t) => {
        const active = "exact" in t && t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
