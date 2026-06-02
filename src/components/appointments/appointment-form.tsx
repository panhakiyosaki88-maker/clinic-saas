"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createAppointment, updateAppointment } from "@/server/actions/appointments";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }

export function AppointmentForm({
  patients,
  doctors,
  appointment,
  defaultPatientId,
  defaultDate,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  appointment?: AppointmentWithNames;
  defaultPatientId?: string;
  defaultDate?: string;
}) {
  const router = useRouter();
  const isEdit = !!appointment;
  const [pending, startTransition] = React.useTransition();
  const [walkIn, setWalkIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const initialDate = appointment ? appointment.scheduled_at.slice(0, 10) : defaultDate ?? "";
  const initialTime = appointment
    ? new Date(appointment.scheduled_at).toTimeString().slice(0, 5)
    : "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEdit) {
        const result = await updateAppointment(appointment!.id, {
          doctorId: String(f.get("doctorId") ?? ""),
          scheduledDate: String(f.get("scheduledDate") ?? ""),
          scheduledTime: String(f.get("scheduledTime") ?? ""),
          durationMinutes: Number(f.get("durationMinutes") ?? 30),
          reason: String(f.get("reason") ?? ""),
          notes: String(f.get("notes") ?? ""),
        });
        if (!result.ok) {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        router.refresh();
        router.push(`/appointments/${appointment!.id}`);
        return;
      }
      const result = await createAppointment({
        patientId: String(f.get("patientId") ?? ""),
        doctorId: String(f.get("doctorId") ?? ""),
        scheduledDate: String(f.get("scheduledDate") ?? ""),
        scheduledTime: String(f.get("scheduledTime") ?? ""),
        durationMinutes: Number(f.get("durationMinutes") ?? 30),
        isWalkIn: walkIn,
        reason: String(f.get("reason") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      router.push("/appointments");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isEdit ? (
        <div className="space-y-2">
          <Label>Patient</Label>
          <p className="text-sm font-medium">{appointment!.patient_name}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="patientId">Patient</Label>
          <select id="patientId" name="patientId" className={selectClass} defaultValue={defaultPatientId ?? ""} required>
            <option value="" disabled>Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {fieldErrors.patientId?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="doctorId">Doctor</Label>
        <select id="doctorId" name="doctorId" className={selectClass} defaultValue={appointment?.doctor_id ?? ""}>
          <option value="">Unassigned</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </div>

      {!isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={walkIn} onChange={(e) => setWalkIn(e.target.checked)} />
          Walk-in (add straight to today&apos;s queue)
        </label>
      )}

      {!walkIn && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="scheduledDate">Date</Label>
            <Input id="scheduledDate" name="scheduledDate" type="date" defaultValue={initialDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">Time</Label>
            <Input id="scheduledTime" name="scheduledTime" type="time" defaultValue={initialTime} />
            {fieldErrors.scheduledTime?.map((m) => (
              <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Duration (min)</Label>
            <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={appointment?.duration_minutes ?? 30} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" defaultValue={appointment?.reason ?? ""} />
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={appointment?.notes ?? ""} />
        </div>
      )}

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create appointment"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
