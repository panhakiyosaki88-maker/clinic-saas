"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/billing/catalog", key: "catalog" },
  { href: "/settings/billing/procedures", key: "procedures" },
  { href: "/settings/billing/memberships", key: "memberships" },
  { href: "/settings/billing/payment", key: "payment" },
];

/** Sub-navigation shared across the billing configuration pages (under Settings). */
export function BillingSettingsTabs() {
  const t = useTranslations("billingSettings.tabs");
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--border)]">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
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
