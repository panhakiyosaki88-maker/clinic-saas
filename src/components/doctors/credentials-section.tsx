"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, BadgeCheck } from "lucide-react";
import {
  addQualification,
  deleteQualification,
  addLicense,
  deleteLicense,
} from "@/server/actions/doctors";
import type { DoctorQualification, DoctorLicense } from "@/lib/db/queries/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : null);

function QualificationList({
  doctorId,
  items,
  canWrite,
}: {
  doctorId: string;
  items: DoctorQualification[];
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
    const year = String(f.get("year") ?? "");
    startTransition(async () => {
      const res = await addQualification({
        doctorId,
        degree: String(f.get("degree") ?? ""),
        institution: String(f.get("institution") ?? ""),
        field: String(f.get("field") ?? ""),
        year: year === "" ? undefined : Number(year),
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
        <CardTitle>Qualifications ({items.length})</CardTitle>
        {canWrite && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Add</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !open && (
          <p className="text-sm text-[var(--muted-foreground)]">No qualifications recorded.</p>
        )}
        <ul className="divide-y divide-[var(--border)]">
          {items.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-3 py-2">
              <div className="flex min-w-0 items-start gap-2">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {q.degree}
                    {q.year != null && (
                      <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">{q.year}</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {[q.field, q.institution, q.notes].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>
              {canWrite && (
                <Button variant="ghost" size="sm" disabled={pendingId === q.id}
                  onClick={() => {
                    setPendingId(q.id);
                    deleteQualification(q.id, doctorId).finally(() => {
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
            <Input name="degree" placeholder="Degree (e.g. MD)" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name="field" placeholder="Field (e.g. Cardiology)" />
              <Input name="institution" placeholder="Institution" />
              <Input name="year" type="number" placeholder="Year" />
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

function LicenseList({
  doctorId,
  items,
  canWrite,
}: {
  doctorId: string;
  items: DoctorLicense[];
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
      const res = await addLicense({
        doctorId,
        licenseNumber: String(f.get("licenseNumber") ?? ""),
        authority: String(f.get("authority") ?? ""),
        jurisdiction: String(f.get("jurisdiction") ?? ""),
        issuedOn: String(f.get("issuedOn") ?? ""),
        expiryOn: String(f.get("expiryOn") ?? ""),
        verified: f.get("verified") === "on",
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
        <CardTitle>Licenses ({items.length})</CardTitle>
        {canWrite && !open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Add</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !open && (
          <p className="text-sm text-[var(--muted-foreground)]">No licenses recorded.</p>
        )}
        <ul className="divide-y divide-[var(--border)]">
          {items.map((l) => {
            const expired = l.expiry_on ? new Date(l.expiry_on).getTime() < Date.now() : false;
            return (
              <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                <div className="flex min-w-0 items-start gap-2">
                  <BadgeCheck className={`mt-0.5 size-4 shrink-0 ${l.verified ? "text-emerald-500" : "text-[var(--muted-foreground)]"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {l.license_number}
                      {l.verified && (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                          Verified
                        </span>
                      )}
                      {expired && (
                        <span className="ml-2 rounded-full bg-[var(--destructive)]/10 px-2 py-0.5 text-xs font-normal text-[var(--destructive)]">
                          Expired
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {[
                        l.authority,
                        l.jurisdiction,
                        fmtDate(l.expiry_on) && `expires ${fmtDate(l.expiry_on)}`,
                      ].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                {canWrite && (
                  <Button variant="ghost" size="sm" disabled={pendingId === l.id}
                    onClick={() => {
                      setPendingId(l.id);
                      deleteLicense(l.id, doctorId).finally(() => {
                        setPendingId(null);
                        router.refresh();
                      });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {open && (
          <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-[var(--border)] p-3">
            <Input name="licenseNumber" placeholder="License number" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name="authority" placeholder="Issuing authority" />
              <Input name="jurisdiction" placeholder="Jurisdiction" />
              <Input name="issuedOn" type="date" />
              <Input name="expiryOn" type="date" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="verified" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              Verified
            </label>
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

export function CredentialsSection({
  doctorId,
  qualifications,
  licenses,
  canWrite,
}: {
  doctorId: string;
  qualifications: DoctorQualification[];
  licenses: DoctorLicense[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-6">
      <QualificationList doctorId={doctorId} items={qualifications} canWrite={canWrite} />
      <LicenseList doctorId={doctorId} items={licenses} canWrite={canWrite} />
    </div>
  );
}
