import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * Branded page hero — the blue→indigo gradient band that mirrors the dashboard's
 * BrandingHeader, giving every module page a consistent identity. Pass the
 * module's nav icon, a title, an optional subtitle, and right-aligned `actions`
 * (use {@link HeaderAction} so buttons read well on the gradient). `children`
 * renders an extra controls row below the title.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white dark:border-slate-800">
      <div className="pointer-events-none absolute -right-8 -top-8 opacity-10">
        <Icon className="size-40" />
      </div>
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{title}</h1>
            {subtitle != null && <p className="mt-0.5 text-sm text-brand-100">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </div>
  );
}

/**
 * A link styled as a button that reads well on the gradient hero — `solid`
 * (white) for the primary action, `outline` (translucent) for secondary ones.
 */
export function HeaderAction({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline";
}) {
  const tone =
    variant === "solid"
      ? "bg-white text-brand-700 hover:bg-brand-50"
      : "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20";
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0 ${tone}`}
    >
      {children}
    </Link>
  );
}
