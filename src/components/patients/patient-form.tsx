"use client";

import * as React from "react";
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
          Demographics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" errors={fieldErrors.fullName}>
            <Input id="fullName" name="fullName" defaultValue={patient?.full_name ?? ""} required autoFocus />
          </Field>
          <Field label="Gender" htmlFor="gender">
            <select id="gender" name="gender" className={selectClass} defaultValue={patient?.gender ?? ""}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth" htmlFor="dateOfBirth" errors={fieldErrors.dateOfBirth}>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={patient?.date_of_birth ?? ""} />
          </Field>
          <Field label="Occupation" htmlFor="occupation">
            <Input id="occupation" name="occupation" defaultValue={patient?.occupation ?? ""} />
          </Field>
          {branches.length > 0 && (
            <Field label="Branch (optional)" htmlFor="branchId">
              <select id="branchId" name="branchId" className={selectClass} defaultValue={patient?.branch_id ?? defaultBranchId ?? ""}>
                <option value="">No branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={patient?.phone ?? ""} />
          </Field>
          <Field label="Email" htmlFor="email" errors={fieldErrors.email}>
            <Input id="email" name="email" type="email" defaultValue={patient?.email ?? ""} />
          </Field>
          <Field label="Blood type" htmlFor="bloodType">
            <select id="bloodType" name="bloodType" className={selectClass} defaultValue={patient?.blood_type ?? ""}>
              <option value="">—</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((b) => (
                <option key={b} value={b}>{b === "unknown" ? "Unknown" : b}</option>
              ))}
            </select>
          </Field>
          <Field label="Marital status" htmlFor="maritalStatus">
            <select id="maritalStatus" name="maritalStatus" className={selectClass} defaultValue={patient?.marital_status ?? ""}>
              <option value="">—</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="ID document type" htmlFor="nationalIdType">
            <select id="nationalIdType" name="nationalIdType" className={selectClass} defaultValue={patient?.national_id_type ?? ""}>
              <option value="">—</option>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="driver_license">Driver license</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="ID document number" htmlFor="nationalIdNumber">
            <Input id="nationalIdNumber" name="nationalIdNumber" defaultValue={patient?.national_id_number ?? ""} />
          </Field>
        </div>
        <Field label="Address" htmlFor="address">
          <Textarea id="address" name="address" defaultValue={patient?.address ?? ""} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Contact preferences
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred language" htmlFor="preferredLanguage">
            <Input id="preferredLanguage" name="preferredLanguage" defaultValue={patient?.preferred_language ?? ""} />
          </Field>
          <Field label="Preferred contact method" htmlFor="preferredContactMethod">
            <select id="preferredContactMethod" name="preferredContactMethod" className={selectClass} defaultValue={patient?.preferred_contact_method ?? ""}>
              <option value="">—</option>
              <option value="phone">Phone</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="none">Do not contact</option>
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
          Do not contact this patient
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Emergency &amp; next of kin
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Emergency contact name" htmlFor="emergencyContactName">
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={patient?.emergency_contact_name ?? ""} />
          </Field>
          <Field label="Emergency contact phone" htmlFor="emergencyContactPhone">
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={patient?.emergency_contact_phone ?? ""} />
          </Field>
          <Field label="Relationship" htmlFor="nextOfKinRelationship">
            <Input id="nextOfKinRelationship" name="nextOfKinRelationship" defaultValue={patient?.next_of_kin_relationship ?? ""} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Medical profile
        </h2>
        <Field label="Allergies" htmlFor="allergies">
          <Textarea id="allergies" name="allergies" defaultValue={patient?.allergies ?? ""} />
        </Field>
        <Field label="Medical history" htmlFor="medicalHistory">
          <Textarea id="medicalHistory" name="medicalHistory" defaultValue={patient?.medical_history ?? ""} />
        </Field>
        <Field label="Chronic diseases" htmlFor="chronicDiseases">
          <Textarea id="chronicDiseases" name="chronicDiseases" defaultValue={patient?.chronic_diseases ?? ""} />
        </Field>
        <Field label="Notes" htmlFor="notes">
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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create patient"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
