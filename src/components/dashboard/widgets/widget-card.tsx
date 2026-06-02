import Link from "next/link";

/** Consistent dashboard card container with an optional title + corner action. */
export function WidgetCard({
  title,
  action,
  className = "",
  bodyClassName = "p-5",
  children,
}: {
  title?: string;
  action?: { href: string; label: string };
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {action && (
            <Link href={action.href} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              {action.label}
            </Link>
          )}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
