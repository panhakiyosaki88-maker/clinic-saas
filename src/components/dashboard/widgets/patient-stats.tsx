import { Users } from "lucide-react";
import type { PatientStats } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

export function PatientStatsWidget({ stats, canRegister }: { stats: PatientStats; canRegister: boolean }) {
  return (
    <WidgetCard title="Patient Statistics" action={{ href: "/patients", label: "View all" }}>
      {stats.total === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients yet"
          hint="Register your first patient to start tracking your practice."
          action={canRegister ? { href: "/patients/new", label: "Register patient" } : undefined}
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.newThisWeek}</p>
            <p className="text-xs text-slate-400">New this week</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.newThisMonth}</p>
            <p className="text-xs text-slate-400">New this month</p>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
