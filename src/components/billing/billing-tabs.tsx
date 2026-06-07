"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/billing", key: "dashboard", exact: true },
  { href: "/billing/workspace", key: "workspace" },
  { href: "/billing/invoices", key: "invoices" },
  { href: "/billing/payments", key: "payments" },
  { href: "/billing/debt", key: "debt" },
  { href: "/billing/reports", key: "reports" },
  { href: "/billing/audit", key: "audit" },
];

/** Sub-navigation shared across the billing pages. */
export function BillingTabs() {
  const t = useTranslations("billing.tabs");
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--border)]">
      {TABS.map((tab) => {
        const active = "exact" in tab && tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
