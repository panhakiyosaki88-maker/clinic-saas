"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addTimelineNote } from "@/server/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AddNoteForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const t = useTranslations("patients.addNote");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await addTimelineNote({
        patientId,
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Input name="title" placeholder={t("placeholder")} required />
      <Textarea name="description" placeholder={t("details")} className="min-h-[56px]" />
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("adding") : t("add")}
      </Button>
    </form>
  );
}
