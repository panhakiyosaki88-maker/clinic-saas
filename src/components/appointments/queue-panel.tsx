import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { QueueEntry } from "@/lib/db/queries/appointments";
import { StatusControl } from "./status-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function QueuePanel({ queue, canWrite }: { queue: QueueEntry[]; canWrite: boolean }) {
  const t = await getTranslations("appointments.queue");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title", { count: queue.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
        ) : (
          <ol className="space-y-2">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-semibold text-[var(--primary)]">
                    {q.position}
                  </span>
                  <span>
                    <Link href={`/appointments/${q.id}`} className="block text-sm font-medium hover:underline">
                      {q.patient_name}
                    </Link>
                    {q.patient_khmer_name && (
                      <span className="block text-xs text-[var(--muted-foreground)]">{q.patient_khmer_name}</span>
                    )}
                  </span>
                </div>
                {canWrite && <StatusControl appointmentId={q.id} status={q.status} />}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
