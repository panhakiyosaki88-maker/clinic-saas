"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createPatient, updatePatient } from "@/server/actions/patients";
import type { Patient } from "@/lib/db/queries/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

function Field({
  label,
  htmlFor,
  errors,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  children: React.ReactNode;
}) {
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

export function PatientForm({
  patient,
  branches = [],
  defaultBranchId,
}: {
  patient?: Patient;
  branches?: BranchOption[];
  defaultBranchId?: string | null;
}) {
  const t = useTranslations("patients.form");
  const tg = useTranslations("patients.gender");
  const router = useRouter();
  const isEdit = !!patient;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const payload = {
      fullName: String(f.get("fullName") ?? ""),
      branchId: String(f.get("branchId") ?? ""),
      gender: String(f.get("gender") ?? "") as never,
      dateOfBirth: String(f.get("dateOfBirth") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      address: String(f.get("address") ?? ""),
      occupation: String(f.get("occupation") ?? ""),
      emergencyContactName: String(f.get("emergencyContactName") ?? ""),
      emergencyContactPhone: String(f.get("emergencyContactPhone") ?? ""),
      bloodType: String(f.get("bloodType") ?? "") as never,
      maritalStatus: String(f.get("maritalStatus") ?? "") as never,
      nationalIdType: String(f.get("nationalIdType") ?? "") as never,
      nationalIdNumber: String(f.get("nationalIdNumber") ?? ""),
      preferredLanguage: String(f.get("preferredLanguage") ?? ""),
      preferredContactMethod: String(f.get("preferredContactMethod") ?? "") as never,
      doNotContact: f.get("doNotContact") === "on",
      nextOfKinRelationship: String(f.get("nextOfKinRelationship") ?? ""),
      allergies: String(f.get("allergies") ?? ""),
      medicalHistory: String(f.get("medicalHistory") ?? ""),
      chronicDiseases: String(f.get("chronicDiseases") ?? ""),
      notes: String(f.get("notes") ?? ""),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updatePatient(patient!.id, payload)
        : await createPatient(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      const id = isEdit ? patient!.id : (result.data as { patientId: string }).patientId;
      router.push(`/patients/${id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {t("sections.demographics")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fullName")} htmlFor="fullName" errors={fieldErrors.fullName}>
            <Input id="fullName" name="fullName" defaultValue={patient?.full_name ?? ""} required autoFocus />
          </Field>
          <Field label={t("gender")} htmlFor="gender">
            <select id="gender" name="gender" className={selectClass} defaultValue={patient?.gender ?? ""}>
              <option value="">—</option>
              <option value="male">{tg("male")}</option>
              <option value="female">{tg("female")}</option>
              <option value="other">{tg("other")}</option>
            </select>
          </Field>
          <Field label={t("dateOfBirth")} htmlFor="dateOfBirth" errors={fieldErrors.dateOfBirth}>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={patient?.date_of_birth ?? ""} />
          </Field>
          <Field label={t("occupation")} htmlFor="occupation">
            <Input id="occupation" name="occupation" defaultValue={patient?.occupation ?? ""} />
          </Field>
          {branches.length > 0 && (
            <Field label={t("branch")} htmlFor="branchId">
              <select id="branchId" name="branchId" className={selectClass} defaultValue={patient?.branch_id ?? defaultBranchId ?? ""}>
                <option value="">{t("noBranch")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t("phone")} htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={patient?.phone ?? ""} />
          </Field>
          <Field label={t("email")} htmlFor="email" errors={fieldErrors.email}>
            <Input id="email" name="email" type="email" defaultValue={patient?.email ?? ""} />
          </Field>
          <Field label={t("bloodType")} htmlFor="bloodType">
            <select id="bloodType" name="bloodType" className={selectClass} defaultValue={patient?.blood_type ?? ""}>
              <option value="">—</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((b) => (
                <option key={b} value={b}>{b === "unknown" ? t("unknown") : b}</option>
              ))}
            </select>
          </Field>
          <Field label={t("maritalStatus")} htmlFor="maritalStatus">
            <select id="maritalStatus" name="maritalStatus" className={selectClass} defaultValue={patient?.marital_status ?? ""}>
              <option value="">—</option>
              <option value="single">{t("marital.single")}</option>
              <option value="married">{t("marital.married")}</option>
              <option value="divorced">{t("marital.divorced")}</option>
              <option value="widowed">{t("marital.widowed")}</option>
              <option value="other">{t("marital.other")}</option>
            </select>
          </Field>
          <Field label={t("idDocType")} htmlFor="nationalIdType">
            <select id="nationalIdType" name="nationalIdType" className={selectClass} defaultValue={patient?.national_id_type ?? ""}>
              <option value="">—</option>
              <option value="national_id">{t("idType.national_id")}</option>
              <option value="passport">{t("idType.passport")}</option>
              <option value="driver_license">{t("idType.driver_license")}</option>
              <option value="other">{t("idType.other")}</option>
            </select>
          </Field>
          <Field label={t("idDocNumber")} htmlFor="nationalIdNumber">
            <Input id="nationalIdNumber" name="nationalIdNumber" defaultValue={patient?.national_id_number ?? ""} />
          </Field>
        </div>
        <Field label={t("address")} htmlFor="address">
          <Textarea id="address" name="address" defaultValue={patient?.address ?? ""} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {t("sections.contact")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("preferredLanguage")} htmlFor="preferredLanguage">
            <Input id="preferredLanguage" name="preferredLanguage" defaultValue={patient?.preferred_language ?? ""} />
          </Field>
          <Field label={t("preferredContactMethod")} htmlFor="preferredContactMethod">
            <select id="preferredContactMethod" name="preferredContactMethod" className={selectClass} defaultValue={patient?.preferred_contact_method ?? ""}>
              <option value="">—</option>
              <option value="phone">{t("contact.phone")}</option>
              <option value="sms">{t("contact.sms")}</option>
              <option value="email">{t("contact.email")}</option>
              <option value="telegram">{t("contact.telegram")}</option>
              <option value="none">{t("contact.none")}</option>
            </select>
          </Field>
        </div>
        <label htmlFor="doNotContact" className="flex items-center gap-2 text-sm">
          <input
            id="doNotContact"
            name="doNotContact"
            type="checkbox"
            defaultChecked={patient?.do_not_contact ?? false}
            className="h-4 w-4 rounded border-slate-300"
          />
          {t("doNotContact")}
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {t("sections.emergency")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("emergencyName")} htmlFor="emergencyContactName">
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={patient?.emergency_contact_name ?? ""} />
          </Field>
          <Field label={t("emergencyPhone")} htmlFor="emergencyContactPhone">
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={patient?.emergency_contact_phone ?? ""} />
          </Field>
          <Field label={t("relationship")} htmlFor="nextOfKinRelationship">
            <Input id="nextOfKinRelationship" name="nextOfKinRelationship" defaultValue={patient?.next_of_kin_relationship ?? ""} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {t("sections.medical")}
        </h2>
        <Field label={t("allergies")} htmlFor="allergies">
          <Textarea id="allergies" name="allergies" defaultValue={patient?.allergies ?? ""} />
        </Field>
        <Field label={t("medicalHistory")} htmlFor="medicalHistory">
          <Textarea id="medicalHistory" name="medicalHistory" defaultValue={patient?.medical_history ?? ""} />
        </Field>
        <Field label={t("chronicDiseases")} htmlFor="chronicDiseases">
          <Textarea id="chronicDiseases" name="chronicDiseases" defaultValue={patient?.chronic_diseases ?? ""} />
        </Field>
        <Field label={t("notes")} htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={patient?.notes ?? ""} />
        </Field>
      </section>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
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
