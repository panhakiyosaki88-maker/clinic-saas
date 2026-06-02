import Link from "next/link";
import type { QueueEntry } from "@/lib/db/queries/appointments";
import { StatusControl } from "./status-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QueuePanel({ queue, canWrite }: { queue: QueueEntry[]; canWrite: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue ({queue.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No one waiting.</p>
        ) : (
          <ol className="space-y-2">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-semibold text-[var(--primary)]">
                    {q.position}
                  </span>
                  <Link href={`/appointments/${q.id}`} className="text-sm font-medium hover:underline">
                    {q.patient_name}
                  </Link>
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
