"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClinic } from "@/server/actions/clinic";
import { slugify } from "@/lib/validations/clinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldErrors = Record<string, string[]>;

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const preview = name ? slugify(name) : "your-clinic";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createClinic({
        name: String(form.get("name") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        country: String(form.get("country") ?? "KH") || "KH",
        timezone: String(form.get("timezone") ?? "Asia/Phnom_Penh") || "Asia/Phnom_Penh",
        currency: String(form.get("currency") ?? "USD") || "USD",
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      // Refresh so the new JWT claims (clinic_id) are picked up, then enter the app.
      router.refresh();
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Clinic name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Phnom Penh Family Clinic"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!fieldErrors.name}
          autoFocus
          required
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          URL: <span className="font-mono">/{preview}</span>
        </p>
        {fieldErrors.name?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="owner@clinic.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input id="contactPhone" name="contactPhone" placeholder="+855 ..." />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue="KH" maxLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue="USD" maxLength={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue="Asia/Phnom_Penh" />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating your clinic…" : "Create clinic"}
      </Button>
    </form>
  );
}
