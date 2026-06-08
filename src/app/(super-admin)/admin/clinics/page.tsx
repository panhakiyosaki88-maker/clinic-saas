import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { listAllClinics } from "@/lib/db/queries/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Clinics · Super Admin" };

export default async function AdminClinicsPage() {
  const [clinics, t] = await Promise.all([listAllClinics(), getTranslations("superAdmin.clinics")]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Building2}
        title={t("title")}
        subtitle={t("subtitle", { count: clinics.length })}
      />
      <Card>
        <CardContent className="p-0">
          {clinics.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">{t("thClinic")}</th>
                  <th className="p-3 font-medium">{t("thPlan")}</th>
                  <th className="p-3 font-medium">{t("thSubscription")}</th>
                  <th className="p-3 font-medium">{t("thStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]">
                    <td className="p-3">
                      <Link href={`/admin/clinics/${c.id}`} className="font-medium text-[var(--primary)] hover:underline">
                        {c.name}
                      </Link>
                      <span className="block font-mono text-xs text-[var(--muted-foreground)]">/{c.slug}</span>
                    </td>
                    <td className="p-3 capitalize">{c.plan ?? "—"}</td>
                    <td className="p-3 capitalize text-[var(--muted-foreground)]">{c.sub_status ?? "—"}</td>
                    <td className="p-3 capitalize">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
