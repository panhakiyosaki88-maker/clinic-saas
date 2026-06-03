import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Polished data-table primitives: zebra rows, soft header band, row hover.
 * Use inside a Card with `overflow-hidden` so the header band clips to the
 * card's rounded corners.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    // Wrapper enables horizontal scroll on narrow screens instead of clipping
    // (the enclosing Card uses overflow-hidden).
    <div className="w-full overflow-x-auto">
      <table
        ref={ref}
        className={cn(
          "w-full min-w-[36rem] text-sm [&_tbody_tr:nth-child(even)]:bg-slate-50/60 dark:[&_tbody_tr:nth-child(even)]:bg-slate-800/20",
          className
        )}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

const THead = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
        className
      )}
      {...props}
    />
  )
);
THead.displayName = "THead";

const TBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />
);
TBody.displayName = "TBody";

const TR = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-t border-slate-100 transition-colors hover:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/40",
        className
      )}
      {...props}
    />
  )
);
TR.displayName = "TR";

const TH = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("px-4 py-2.5 font-medium", className)} {...props} />
  )
);
TH.displayName = "TH";

const TD = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3", className)} {...props} />
  )
);
TD.displayName = "TD";

export { Table, THead, TBody, TR, TH, TD };
