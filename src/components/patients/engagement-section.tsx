"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { addConsent, deleteConsent } from "@/server/actions/patients";
import type { PatientConsent, PatientCommunication } from "@/lib/db/queries/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const CONSENT_TYPES = [
  { value: "treatment", label: "Treatment" },
  { value: "data_sharing", label: "Data sharing" },
  { value: "marketing", label: "Marketing" },
  { value: "photography", label: "Photography" },
];

function ConsentList({
  patientId,
  consents,
  canWrite,
}: {
  patientId: string;
  consents: PatientConsent[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await addConsent({
        patientId,
        consentType: String(f.get("consentType") ?? ""),
        granted: f.get("granted") === "granted",
        signedOn: String(f.get("signedOn") ?? ""),
        notes: String(f.get("notes") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Consent ({consents.length})</CardTitle>
        {canWrite && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Record consent
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {consents.length === 0 && !open && (
          <p className="text-sm text-[var(--muted-foreground)]">No consent records.</p>
        )}
        <ul className="divide-y divide-[var(--border)]">
          {consents.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">
                  {c.consent_type.replace("_", " ")}
                  <span
                    className={
                      "ml-2 rounded-full px-2 py-0.5 text-xs font-normal " +
                      (c.granted
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-[var(--destructive)]/10 text-[var(--destructive)]")
                    }
                  >
                    {c.granted ? "Granted" : "Declined"}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {[c.signed_on && `Signed ${new Date(c.signed_on).toLocaleDateString()}`, c.notes]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === c.id}
                  onClick={() => {
                    setPendingId(c.id);
                    deleteConsent(c.id, patientId).finally(() => {
                      setPendingId(null);
                      router.refresh();
                    });
                  }}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
        {open && (
          <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-[var(--border)] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="consentType" className={selectClass} defaultValue="treatment">
                {CONSENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select name="granted" className={selectClass} defaultValue="granted">
                <option value="granted">Granted</option>
                <option value="declined">Declined</option>
              </select>
              <Input name="signedOn" type="date" />
              <Input name="notes" placeholder="Notes (optional)" />
            </div>
            {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>Save</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function CommunicationLog({ communications }: { communications: PatientCommunication[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication log ({communications.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {communications.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No messages logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {communications.map((m) => (
              <li key={m.id} className="flex gap-2 border-l-2 border-[var(--border)] pl-3">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {m.subject || "(no subject)"}
                    {m.channel && (
                      <span className="ml-2 text-xs font-normal capitalize text-[var(--muted-foreground)]">
                        {m.channel} · {m.direction}
                      </span>
                    )}
                  </p>
                  {m.body && <p className="truncate text-sm text-[var(--muted-foreground)]">{m.body}</p>}
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(m.sent_at).toLocaleString()}
                    {m.status ? ` · ${m.status}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function EngagementSection({
  patientId,
  consents,
  communications,
  canWrite,
}: {
  patientId: string;
  consents: PatientConsent[];
  communications: PatientCommunication[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-6">
      <ConsentList patientId={patientId} consents={consents} canWrite={canWrite} />
      <CommunicationLog communications={communications} />
    </div>
  );
}
