"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/billing/catalog", label: "Price catalog" },
  { href: "/settings/billing/procedures", label: "Procedures" },
  { href: "/settings/billing/memberships", label: "Memberships" },
  { href: "/settings/billing/payment", label: "Payment settings" },
];

/** Sub-navigation shared across the billing configuration pages (under Settings). */
export function BillingSettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--border)]">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
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
