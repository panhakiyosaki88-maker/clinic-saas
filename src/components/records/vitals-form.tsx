"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addVitalSigns } from "@/server/actions/medical-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Num({ label, name, step }: { label: string; name: string; step?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`v_${name}`} className="text-xs">{label}</Label>
      <Input id={`v_${name}`} name={name} type="number" step={step} className="h-8" />
    </div>
  );
}

export function VitalsForm({
  patientId,
  medicalRecordId,
}: {
  patientId: string;
  medicalRecordId?: string;
}) {
  const router = useRouter();
  const t = useTranslations("records.vitalsForm");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "");
      return v === "" ? undefined : Number(v);
    };
    startTransition(async () => {
      const result = await addVitalSigns({
        patientId,
        medicalRecordId,
        systolic: num("systolic"),
        diastolic: num("diastolic"),
        pulse: num("pulse"),
        temperature: num("temperature"),
        heightCm: num("heightCm"),
        weightKg: num("weightKg"),
        oxygenSaturation: num("oxygenSaturation"),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num label="Systolic" name="systolic" />
        <Num label="Diastolic" name="diastolic" />
        <Num label="Pulse" name="pulse" />
        <Num label="Temp °C" name="temperature" step="0.1" />
        <Num label="Height cm" name="heightCm" step="0.1" />
        <Num label="Weight kg" name="weightKg" step="0.1" />
        <Num label="SpO₂ %" name="oxygenSaturation" />
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("saving") : t("addVitals")}
      </Button>
    </form>
  );
}
