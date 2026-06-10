import * as React from "react";

/**
 * Renders a patient's Latin name with their Khmer name beneath it (when set),
 * so the bilingual name is shown consistently everywhere a patient appears.
 *
 * The Latin line is `children` when provided (e.g. a <Link> or styled span),
 * otherwise `name`. `number` is appended to the Latin line when given.
 */
export function PatientName({
  name,
  khmerName,
  number,
  className,
  khmerClassName = "text-xs font-normal text-[var(--muted-foreground)]",
  children,
}: {
  name?: string;
  khmerName?: string | null;
  number?: string | null;
  className?: string;
  khmerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <span className={className}>
      <span>
        {children ?? name}
        {number ? <span className="ml-2 text-xs font-normal text-slate-400">{number}</span> : null}
      </span>
      {khmerName ? <span className={`block ${khmerClassName}`}>{khmerName}</span> : null}
    </span>
  );
}
