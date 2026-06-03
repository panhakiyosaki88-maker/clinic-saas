"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateClinic } from "@/server/actions/clinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ClinicProfile {
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string;
  timezone: string;
  currency: string;
}

export function ClinicProfileForm({ clinic }: { clinic: ClinicProfile }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateClinic({
        name: String(form.get("name") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        currency: String(form.get("currency") ?? ""),
        timezone: String(form.get("timezone") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Clinic name</Label>
        <Input id="name" name="name" defaultValue={clinic.name} aria-invalid={!!fieldErrors.name} required />
        <p className="text-xs text-[var(--muted-foreground)]">
          URL: <span className="font-mono">/{clinic.slug}</span>
        </p>
        {fieldErrors.name?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={clinic.contactEmail ?? ""} />
          {fieldErrors.contactEmail?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input id="contactPhone" name="contactPhone" defaultValue={clinic.contactPhone ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue={clinic.country} maxLength={2} disabled />
          <p className="text-xs text-[var(--muted-foreground)]">Set at sign-up</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue={clinic.currency} maxLength={3} />
          {fieldErrors.currency?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={clinic.timezone} />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          Changes saved.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
