import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive data-table wrapper. Renders the full data table on tablet/desktop
 * (md and up) — exactly as before — and a stacked card list on mobile (below md).
 *
 * The desktop path is intentionally untouched: pass the existing
 * `<Table>…</Table>` (or any table markup) as `children`. Build the mobile card
 * list with {@link DataCard} / {@link DataCardRow} and pass it as `cards`.
 *
 * This component is presentation-only (no hooks / no state), so it can be used
 * from both Server and Client Components.
 */
export function ResponsiveTable({
  children,
  cards,
  className,
}: {
  /** Desktop table markup — shown at md and up. */
  children: React.ReactNode;
  /** Mobile card list — shown below md. */
  cards: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="hidden md:block">{children}</div>
      <div className="space-y-3 p-3 md:hidden">{cards}</div>
    </div>
  );
}

/**
 * A single record rendered as a card on mobile. `title` is the prominent line
 * (e.g. a name link), `actions` sits top-right, and `children` (typically
 * {@link DataCardRow}s) render the record's fields in a two-column grid.
 */
export function DataCard({
  title,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-medium">{title}</div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">{children}</dl>
      )}
    </div>
  );
}

/**
 * A label/value pair inside a {@link DataCard}. Spans the full card width when
 * `wide` is set (useful for long values such as addresses).
 */
export function DataCardRow({
  label,
  value,
  wide = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2", className)}>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      {/* Wrap long values (e.g. large KHR amounts) instead of clipping them. */}
      <dd className="text-[var(--foreground)] [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
