"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createDoctor, updateDoctor } from "@/server/actions/doctors";
import type { Doctor } from "@/lib/db/queries/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({ label, htmlFor, errors, children }: { label: string; htmlFor: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {errors?.map((m) => (
        <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
      ))}
    </div>
  );
}

export function DoctorForm({ doctor }: { doctor?: Doctor }) {
  const router = useRouter();
  const isEdit = !!doctor;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const fee = String(f.get("consultationFee") ?? "");
    const payload = {
      fullName: String(f.get("fullName") ?? ""),
      specialization: String(f.get("specialization") ?? ""),
      licenseNumber: String(f.get("licenseNumber") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      bio: String(f.get("bio") ?? ""),
      consultationFee: fee === "" ? undefined : Number(fee),
      isActive: f.get("isActive") === "on",
    };

    startTransition(async () => {
      const result = isEdit ? await updateDoctor(doctor!.id, payload) : await createDoctor(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      const id = isEdit ? doctor!.id : (result.data as { doctorId: string }).doctorId;
      router.push(`/doctors/${id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" errors={fieldErrors.fullName}>
          <Input id="fullName" name="fullName" defaultValue={doctor?.full_name ?? ""} required autoFocus />
        </Field>
        <Field label="Specialization" htmlFor="specialization">
          <Input id="specialization" name="specialization" defaultValue={doctor?.specialization ?? ""} />
        </Field>
        <Field label="License number" htmlFor="licenseNumber">
          <Input id="licenseNumber" name="licenseNumber" defaultValue={doctor?.license_number ?? ""} />
        </Field>
        <Field label="Consultation fee" htmlFor="consultationFee">
          <Input id="consultationFee" name="consultationFee" type="number" step="0.01" defaultValue={doctor?.consultation_fee ?? ""} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={doctor?.phone ?? ""} />
        </Field>
        <Field label="Email" htmlFor="email" errors={fieldErrors.email}>
          <Input id="email" name="email" type="email" defaultValue={doctor?.email ?? ""} />
        </Field>
      </div>
      <Field label="Bio" htmlFor="bio">
        <Textarea id="bio" name="bio" defaultValue={doctor?.bio ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={doctor?.is_active ?? true} />
        Active (accepting patients)
      </label>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create doctor"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
