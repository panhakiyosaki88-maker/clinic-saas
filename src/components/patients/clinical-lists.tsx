"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  addAllergy,
  deleteAllergy,
  addMedication,
  deleteMedication,
  addImmunization,
  deleteImmunization,
  addCondition,
  deleteCondition,
} from "@/server/actions/patients";
import type {
  PatientAllergy,
  PatientMedication,
  PatientImmunization,
  PatientCondition,
} from "@/lib/db/queries/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function Row({
  id,
  patientId,
  primary,
  meta,
  badge,
  badgeTone,
  canWrite,
  onDelete,
}: {
  id: string;
  patientId: string;
  primary: string;
  meta?: string;
  badge?: string;
  badgeTone?: "default" | "alert";
  canWrite: boolean;
  onDelete: (id: string, patientId: string) => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {primary}
          {badge && (
            <span
              className={
                "ml-2 rounded-full px-2 py-0.5 text-xs font-normal " +
                (badgeTone === "alert"
                  ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]")
              }
            >
              {badge}
            </span>
          )}
        </p>
        {meta && <p className="text-xs text-[var(--muted-foreground)]">{meta}</p>}
      </div>
      {canWrite && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setPending(true);
            onDelete(id, patientId).finally(() => {
              setPending(false);
              router.refresh();
            });
          }}
        >
          Remove
        </Button>
      )}
    </li>
  );
}

function Section({
  title,
  count,
  canWrite,
  children,
  form,
}: {
  title: string;
  count: number;
  canWrite: boolean;
  children: React.ReactNode;
  form: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>
          {title} ({count})
        </CardTitle>
        {canWrite && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {count === 0 && !open && (
          <p className="text-sm text-[var(--muted-foreground)]">Nothing recorded.</p>
        )}
        {children}
        {open && form(() => setOpen(false))}
      </CardContent>
    </Card>
  );
}

/** Shared submit wrapper: runs the action, shows errors, resets + closes on success. */
function useEntryForm(action: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  function submit(form: HTMLFormElement, build: (f: FormData) => Record<string, unknown>, close: () => void) {
    setError(null);
    const payload = build(new FormData(form));
    startTransition(async () => {
      const res = await action(payload);
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      form.reset();
      close();
      router.refresh();
    });
  }
  return { pending, error, submit };
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : null);

export function ClinicalLists({
  patientId,
  canWrite,
  allergies,
  medications,
  immunizations,
  conditions,
}: {
  patientId: string;
  canWrite: boolean;
  allergies: PatientAllergy[];
  medications: PatientMedication[];
  immunizations: PatientImmunization[];
  conditions: PatientCondition[];
}) {
  const allergyForm = useEntryForm(addAllergy as never);
  const medForm = useEntryForm(addMedication as never);
  const immForm = useEntryForm(addImmunization as never);
  const condForm = useEntryForm(addCondition as never);

  return (
    <div className="space-y-6">
      {/* Problem list */}
      <Section title="Problem list" count={conditions.length} canWrite={canWrite}
        form={(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              condForm.submit(e.currentTarget, (f) => ({
                patientId,
                condition: String(f.get("condition") ?? ""),
                status: String(f.get("status") ?? ""),
                diagnosedOn: String(f.get("diagnosedOn") ?? ""),
                notes: String(f.get("notes") ?? ""),
              }), close);
            }}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <Input name="condition" placeholder="Condition" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="status" className={selectClass} defaultValue="active">
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="inactive">Inactive</option>
              </select>
              <Input name="diagnosedOn" type="date" />
            </div>
            <Input name="notes" placeholder="Notes (optional)" />
            {condForm.error && <p className="text-xs text-[var(--destructive)]">{condForm.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={condForm.pending}>Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={close}>Cancel</Button>
            </div>
          </form>
        )}
      >
        <ul className="divide-y divide-[var(--border)]">
          {conditions.map((c) => (
            <Row key={c.id} id={c.id} patientId={patientId} canWrite={canWrite} onDelete={deleteCondition}
              primary={c.condition}
              badge={c.status}
              badgeTone={c.status === "active" ? "alert" : "default"}
              meta={[fmtDate(c.diagnosed_on) && `Dx ${fmtDate(c.diagnosed_on)}`, c.notes].filter(Boolean).join(" · ") || undefined}
            />
          ))}
        </ul>
      </Section>

      {/* Medications */}
      <Section title="Medications" count={medications.length} canWrite={canWrite}
        form={(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              medForm.submit(e.currentTarget, (f) => ({
                patientId,
                name: String(f.get("name") ?? ""),
                dose: String(f.get("dose") ?? ""),
                frequency: String(f.get("frequency") ?? ""),
                route: String(f.get("route") ?? ""),
                startedOn: String(f.get("startedOn") ?? ""),
                status: String(f.get("status") ?? ""),
              }), close);
            }}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <Input name="name" placeholder="Medication name" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name="dose" placeholder="Dose (e.g. 500mg)" />
              <Input name="frequency" placeholder="Frequency (e.g. BID)" />
              <Input name="route" placeholder="Route (e.g. oral)" />
              <Input name="startedOn" type="date" />
            </div>
            <select name="status" className={selectClass} defaultValue="active">
              <option value="active">Active</option>
              <option value="stopped">Stopped</option>
              <option value="completed">Completed</option>
            </select>
            {medForm.error && <p className="text-xs text-[var(--destructive)]">{medForm.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={medForm.pending}>Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={close}>Cancel</Button>
            </div>
          </form>
        )}
      >
        <ul className="divide-y divide-[var(--border)]">
          {medications.map((m) => (
            <Row key={m.id} id={m.id} patientId={patientId} canWrite={canWrite} onDelete={deleteMedication}
              primary={m.name}
              badge={m.status}
              badgeTone={m.status === "active" ? "default" : "default"}
              meta={[m.dose, m.frequency, m.route, fmtDate(m.started_on) && `since ${fmtDate(m.started_on)}`].filter(Boolean).join(" · ") || undefined}
            />
          ))}
        </ul>
      </Section>

      {/* Allergies */}
      <Section title="Allergies" count={allergies.length} canWrite={canWrite}
        form={(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              allergyForm.submit(e.currentTarget, (f) => ({
                patientId,
                substance: String(f.get("substance") ?? ""),
                reaction: String(f.get("reaction") ?? ""),
                severity: String(f.get("severity") ?? ""),
                notedAt: String(f.get("notedAt") ?? ""),
              }), close);
            }}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <Input name="substance" placeholder="Substance" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name="reaction" placeholder="Reaction" />
              <select name="severity" className={selectClass} defaultValue="">
                <option value="">Severity —</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
            <Input name="notedAt" type="date" />
            {allergyForm.error && <p className="text-xs text-[var(--destructive)]">{allergyForm.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={allergyForm.pending}>Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={close}>Cancel</Button>
            </div>
          </form>
        )}
      >
        <ul className="divide-y divide-[var(--border)]">
          {allergies.map((a) => (
            <Row key={a.id} id={a.id} patientId={patientId} canWrite={canWrite} onDelete={deleteAllergy}
              primary={a.substance}
              badge={a.severity ?? undefined}
              badgeTone={a.severity === "severe" ? "alert" : "default"}
              meta={[a.reaction, fmtDate(a.noted_at)].filter(Boolean).join(" · ") || undefined}
            />
          ))}
        </ul>
      </Section>

      {/* Immunizations */}
      <Section title="Immunizations" count={immunizations.length} canWrite={canWrite}
        form={(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              immForm.submit(e.currentTarget, (f) => ({
                patientId,
                vaccine: String(f.get("vaccine") ?? ""),
                doseLabel: String(f.get("doseLabel") ?? ""),
                givenOn: String(f.get("givenOn") ?? ""),
                nextDueOn: String(f.get("nextDueOn") ?? ""),
                provider: String(f.get("provider") ?? ""),
              }), close);
            }}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <Input name="vaccine" placeholder="Vaccine" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name="doseLabel" placeholder="Dose (e.g. 1st)" />
              <Input name="provider" placeholder="Provider" />
              <Input name="givenOn" type="date" />
              <Input name="nextDueOn" type="date" />
            </div>
            {immForm.error && <p className="text-xs text-[var(--destructive)]">{immForm.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={immForm.pending}>Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={close}>Cancel</Button>
            </div>
          </form>
        )}
      >
        <ul className="divide-y divide-[var(--border)]">
          {immunizations.map((i) => (
            <Row key={i.id} id={i.id} patientId={patientId} canWrite={canWrite} onDelete={deleteImmunization}
              primary={i.vaccine}
              badge={i.dose_label ?? undefined}
              meta={[fmtDate(i.given_on) && `given ${fmtDate(i.given_on)}`, fmtDate(i.next_due_on) && `next ${fmtDate(i.next_due_on)}`, i.provider].filter(Boolean).join(" · ") || undefined}
            />
          ))}
        </ul>
      </Section>
    </div>
  );
}
