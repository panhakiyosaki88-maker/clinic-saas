import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  getRevenueReport,
  getNewPatientsCount,
  getAppointmentsByStatus,
  getDoctorActivity,
  getInventoryReport,
  getOutstandingReport,
} from "@/lib/db/queries/reports";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ymd, parseYmd, startOfMonth, addDays } from "@/lib/date";
import { BarChart3 } from "lucide-react";
import { DateRange } from "@/components/reports/date-range";
import { ReportExport } from "@/components/reports/report-export";
import { PrintButton } from "@/components/print-button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.REPORTS_VIEW))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view reports.
        </p>
      </main>
    );
  }

  const sp = await searchParams;
  const fromDate = sp.from ? parseYmd(sp.from) : startOfMonth(new Date());
  const toDate = sp.to ? addDays(parseYmd(sp.to), 1) : addDays(new Date(), 1); // inclusive end
  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  const [canBilling, canAppts, canEmr, canPharmacy] = await Promise.all([
    hasPermission(PERMISSIONS.BILLING_READ),
    hasPermission(PERMISSIONS.APPOINTMENTS_READ),
    hasPermission(PERMISSIONS.EMR_READ),
    hasPermission(PERMISSIONS.PHARMACY_READ),
  ]);

  const [revenue, newPatients, byStatus, doctorActivity, inventory, outstanding] = await Promise.all([
    canBilling ? getRevenueReport(fromISO, toISO) : Promise.resolve(null),
    getNewPatientsCount(fromISO, toISO),
    canAppts ? getAppointmentsByStatus(fromISO, toISO) : Promise.resolve(null),
    canEmr ? getDoctorActivity(fromISO, toISO) : Promise.resolve(null),
    canPharmacy ? getInventoryReport() : Promise.resolve(null),
    canBilling ? getOutstandingReport() : Promise.resolve(null),
  ]);

  const money = (n: number) => Number(n).toFixed(2);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 print:max-w-none print:p-0">
      <PageHeader
        icon={BarChart3}
        title="Reports"
        subtitle={`${sp.from ?? ymd(startOfMonth(new Date()))} → ${sp.to ?? ymd(new Date())}`}
      />

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <DateRange from={sp.from ?? ymd(startOfMonth(new Date()))} to={sp.to ?? ymd(new Date())} />
        <PrintButton label="PDF" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {revenue && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{money(revenue.total)}</p></CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">New patients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{newPatients}</p></CardContent>
        </Card>
        {outstanding && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Outstanding</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{money(outstanding.total)}</p></CardContent>
          </Card>
        )}
        {inventory && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Stock value</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{money(inventory.stockValue)}</p></CardContent>
          </Card>
        )}
      </div>

      {revenue && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Revenue by day</CardTitle>
            <ReportExport
              name="revenue-by-day"
              columns={[{ key: "date", label: "Date" }, { key: "amount", label: "Amount" }]}
              rows={revenue.byDay}
            />
          </CardHeader>
          <CardContent>
            {revenue.byDay.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No payments in range.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {revenue.byDay.map((r) => (
                    <tr key={r.date} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1">{r.date}</td>
                      <td className="py-1 text-right tabular-nums">{money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {revenue.byMethod.length > 0 && (
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                {revenue.byMethod.map((m) => `${m.method}: ${money(m.amount)}`).join("  ·  ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {byStatus && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Appointments by status</CardTitle>
            <ReportExport name="appointments-by-status" columns={[{ key: "status", label: "Status" }, { key: "count", label: "Count" }]} rows={byStatus} />
          </CardHeader>
          <CardContent>
            {byStatus.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No appointments in range.</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {byStatus.map((r) => (
                    <tr key={r.status} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1 capitalize">{r.status}</td>
                      <td className="py-1 text-right tabular-nums">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {doctorActivity && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Doctor activity (visits)</CardTitle>
            <ReportExport name="doctor-activity" columns={[{ key: "doctor", label: "Doctor" }, { key: "visits", label: "Visits" }]} rows={doctorActivity} />
          </CardHeader>
          <CardContent>
            {doctorActivity.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No doctors.</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {doctorActivity.map((r) => (
                    <tr key={r.doctor} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1">{r.doctor}</td>
                      <td className="py-1 text-right tabular-nums">{r.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {outstanding && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Outstanding invoices ({outstanding.count})</CardTitle>
            <ReportExport
              name="outstanding-invoices"
              columns={[{ key: "invoice_number", label: "Invoice" }, { key: "patient", label: "Patient" }, { key: "balance", label: "Balance" }]}
              rows={outstanding.rows}
            />
          </CardHeader>
          <CardContent>
            {outstanding.rows.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Nothing outstanding.</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {outstanding.rows.map((r) => (
                    <tr key={r.invoice_number} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1 font-mono text-xs">{r.invoice_number}</td>
                      <td className="py-1">{r.patient}</td>
                      <td className="py-1 text-right tabular-nums">{money(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
