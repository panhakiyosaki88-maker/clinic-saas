"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createDoctor, updateDoctor } from "@/server/actions/doctors";
import type { Doctor } from "@/lib/db/queries/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

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

export interface BranchOption { id: string; name: string }

export function DoctorForm({
  doctor,
  branches = [],
  defaultBranchId,
}: {
  doctor?: Doctor;
  branches?: BranchOption[];
  defaultBranchId?: string | null;
}) {
  const t = useTranslations("doctors.form");
  const te = useTranslations("doctors.employment");
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
    const years = String(f.get("yearsExperience") ?? "");
    const payload = {
      fullName: String(f.get("fullName") ?? ""),
      title: String(f.get("title") ?? ""),
      specialization: String(f.get("specialization") ?? ""),
      subSpecialty: String(f.get("subSpecialty") ?? ""),
      licenseNumber: String(f.get("licenseNumber") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      bio: String(f.get("bio") ?? ""),
      consultationFee: fee === "" ? undefined : Number(fee),
      gender: String(f.get("gender") ?? "") as never,
      languages: String(f.get("languages") ?? ""),
      employmentType: String(f.get("employmentType") ?? "") as never,
      yearsExperience: years === "" ? undefined : Number(years),
      joinedOn: String(f.get("joinedOn") ?? ""),
      room: String(f.get("room") ?? ""),
      licenseExpiry: String(f.get("licenseExpiry") ?? ""),
      licenseVerified: f.get("licenseVerified") === "on",
      isActive: f.get("isActive") === "on",
      branchId: String(f.get("branchId") ?? ""),
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
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("sections.identity")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("title")} htmlFor="title">
            <Input id="title" name="title" placeholder="Dr. / Prof." defaultValue={doctor?.title ?? ""} />
          </Field>
          <Field label={t("fullName")} htmlFor="fullName" errors={fieldErrors.fullName}>
            <Input id="fullName" name="fullName" defaultValue={doctor?.full_name ?? ""} required autoFocus />
          </Field>
          <Field label={t("gender")} htmlFor="gender">
            <select id="gender" name="gender" className={selectClass} defaultValue={doctor?.gender ?? ""}>
              <option value="">—</option>
              <option value="male">{t("genderOpt.male")}</option>
              <option value="female">{t("genderOpt.female")}</option>
              <option value="other">{t("genderOpt.other")}</option>
            </select>
          </Field>
          <Field label={t("languages")} htmlFor="languages">
            <Input id="languages" name="languages" placeholder="English, Khmer" defaultValue={doctor?.languages ?? ""} />
          </Field>
          <Field label={t("phone")} htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={doctor?.phone ?? ""} />
          </Field>
          <Field label={t("email")} htmlFor="email" errors={fieldErrors.email}>
            <Input id="email" name="email" type="email" defaultValue={doctor?.email ?? ""} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("sections.professional")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("specialization")} htmlFor="specialization">
            <Input id="specialization" name="specialization" defaultValue={doctor?.specialization ?? ""} />
          </Field>
          <Field label={t("subSpecialty")} htmlFor="subSpecialty">
            <Input id="subSpecialty" name="subSpecialty" defaultValue={doctor?.sub_specialty ?? ""} />
          </Field>
          <Field label={t("yearsExperience")} htmlFor="yearsExperience">
            <Input id="yearsExperience" name="yearsExperience" type="number" min="0" defaultValue={doctor?.years_experience ?? ""} />
          </Field>
          <Field label={t("consultationFee")} htmlFor="consultationFee">
            <Input id="consultationFee" name="consultationFee" type="number" step="0.01" defaultValue={doctor?.consultation_fee ?? ""} />
          </Field>
        </div>
        <Field label={t("bio")} htmlFor="bio">
          <Textarea id="bio" name="bio" defaultValue={doctor?.bio ?? ""} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("sections.credentials")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("licenseNumber")} htmlFor="licenseNumber">
            <Input id="licenseNumber" name="licenseNumber" defaultValue={doctor?.license_number ?? ""} />
          </Field>
          <Field label={t("licenseExpiry")} htmlFor="licenseExpiry">
            <Input id="licenseExpiry" name="licenseExpiry" type="date" defaultValue={doctor?.license_expiry ?? ""} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="licenseVerified" defaultChecked={doctor?.license_verified ?? false} className="h-4 w-4 rounded border-slate-300" />
          {t("licenseVerified")}
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("sections.employment")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("employmentType")} htmlFor="employmentType">
            <select id="employmentType" name="employmentType" className={selectClass} defaultValue={doctor?.employment_type ?? ""}>
              <option value="">—</option>
              <option value="full_time">{te("full_time")}</option>
              <option value="part_time">{te("part_time")}</option>
              <option value="contract">{te("contract")}</option>
              <option value="visiting">{te("visiting")}</option>
              <option value="locum">{te("locum")}</option>
            </select>
          </Field>
          <Field label={t("joinedOn")} htmlFor="joinedOn">
            <Input id="joinedOn" name="joinedOn" type="date" defaultValue={doctor?.joined_on ?? ""} />
          </Field>
          <Field label={t("room")} htmlFor="room">
            <Input id="room" name="room" defaultValue={doctor?.room ?? ""} />
          </Field>
          {branches.length > 0 && (
            <Field label={t("branch")} htmlFor="branchId">
              <select id="branchId" name="branchId" className={selectClass} defaultValue={doctor?.branch_id ?? defaultBranchId ?? ""}>
                <option value="">{t("noBranch")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={doctor?.is_active ?? true} className="h-4 w-4 rounded border-slate-300" />
          {t("active")}
        </label>
      </section>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : isEdit ? t("save") : t("create")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
