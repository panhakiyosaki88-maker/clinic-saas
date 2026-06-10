import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { timeLabel } from "@/lib/date";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { StatusBadge } from "./status-badge";
import { StatusControl } from "./status-control";
import { Card, CardContent } from "@/components/ui/card";

export async function DayView({
  appointments,
  canWrite,
}: {
  appointments: AppointmentWithNames[];
  canWrite: boolean;
}) {
  const t = await getTranslations("appointments");
  if (appointments.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-[var(--muted-foreground)]">{t("day.empty")}</p>;
  }
  return (
    <Card>
      <CardContent className="divide-y divide-[var(--border)] p-0">
        {appointments.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-3">
              <span className="w-14 font-mono text-sm text-[var(--muted-foreground)]">
                {a.is_walk_in ? t("labels.walkIn") : timeLabel(a.scheduled_at)}
              </span>
              <div>
                <Link href={`/appointments/${a.id}`} className="block text-sm font-medium text-[var(--primary)] hover:underline">
                  {a.patient_name}
                </Link>
                {a.patient_khmer_name && (
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">{a.patient_khmer_name}</p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  {a.doctor_name && <DoctorAvatar name={a.doctor_name} avatarPath={a.doctor_avatar_path} size={32} />}
                  <span>{a.doctor_name ?? t("labels.unassigned")}{a.reason ? ` · ${a.reason}` : ""}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status} />
              {canWrite && <StatusControl appointmentId={a.id} status={a.status} />}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
