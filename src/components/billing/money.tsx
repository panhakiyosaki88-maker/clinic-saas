import { formatMoney, type CurrencyContext } from "@/lib/billing/currency";

/**
 * Renders a stored USD amount with dual currency: the clinic's primary currency
 * large, the equivalent in the other currency muted beside it. Server-safe (no
 * hooks), usable in both server and client components.
 */
export function Money({
  usd,
  ctx,
  className,
  secondary = true,
}: {
  usd: number;
  ctx: CurrencyContext;
  className?: string;
  /** Hide the secondary equivalent when false. */
  secondary?: boolean;
}) {
  const parts = formatMoney(usd, ctx);
  return (
    <span className={className}>
      <span className="tabular-nums">{parts.primary}</span>
      {secondary && (
        <span className="ml-1 text-xs font-normal text-[var(--muted-foreground)] tabular-nums">{parts.secondary}</span>
      )}
    </span>
  );
}
