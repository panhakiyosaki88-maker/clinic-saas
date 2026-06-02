import Link from "next/link";
import { PackageCheck, AlertTriangle, CalendarX } from "lucide-react";
import type { Medicine, ExpiringBatch } from "@/lib/db/queries/pharmacy";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

export function InventoryAlerts({
  lowStock,
  expiring,
}: {
  lowStock: Medicine[];
  expiring: ExpiringBatch[];
}) {
  const nothing = lowStock.length === 0 && expiring.length === 0;
  return (
    <WidgetCard title="Inventory Alerts" action={{ href: "/pharmacy", label: "Pharmacy" }} bodyClassName="">
      {nothing ? (
        <EmptyState icon={PackageCheck} title="Inventory healthy" hint="No low-stock or expiring items right now." tone="positive" />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {lowStock.slice(0, 5).map((m) => (
            <li key={`low-${m.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-amber-500" />
                <Link href={`/pharmacy/${m.id}`} className="hover:underline">{m.name}</Link>
              </span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {m.stock_quantity} left
              </span>
            </li>
          ))}
          {expiring.slice(0, 5).map((b) => (
            <li key={`exp-${b.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <CalendarX className="size-4 text-rose-500" />
                <Link href={`/pharmacy/${b.medicine_id}`} className="hover:underline">{b.medicine_name}</Link>
              </span>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">exp {b.expiry_date}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
