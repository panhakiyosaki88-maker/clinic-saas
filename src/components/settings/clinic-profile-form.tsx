"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { updateClinic } from "@/server/actions/clinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ClinicCustomFieldInput {
  label: string;
  value: string;
}

export interface ClinicProfile {
  name: string;
  subtitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  telegram: string | null;
  facebookPage: string | null;
  customFields: ClinicCustomFieldInput[];
}

export function ClinicProfileForm({ clinic }: { clinic: ClinicProfile }) {
  const router = useRouter();
  const t = useTranslations("settings.profileForm");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [customFields, setCustomFields] = React.useState<ClinicCustomFieldInput[]>(
    clinic.customFields.length ? clinic.customFields : []
  );

  const addCustomField = () => setCustomFields((rows) => [...rows, { label: "", value: "" }]);
  const removeCustomField = (i: number) =>
    setCustomFields((rows) => rows.filter((_, idx) => idx !== i));
  const updateCustomField = (i: number, patch: Partial<ClinicCustomFieldInput>) =>
    setCustomFields((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateClinic({
        name: String(form.get("name") ?? ""),
        subtitle: String(form.get("subtitle") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        address: String(form.get("address") ?? ""),
        telegram: String(form.get("telegram") ?? ""),
        facebookPage: String(form.get("facebookPage") ?? ""),
        // Drop fully-empty rows; trim the rest so blank labels don't reach the server.
        customFields: customFields
          .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
          .filter((r) => r.label || r.value),
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
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" defaultValue={clinic.name} aria-invalid={!!fieldErrors.name} required />
        {fieldErrors.name?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">{t("subtitle")}</Label>
        <Input
          id="subtitle"
          name="subtitle"
          defaultValue={clinic.subtitle ?? ""}
          maxLength={120}
          placeholder={t("subtitlePlaceholder")}
          aria-invalid={!!fieldErrors.subtitle}
        />
        <p className="text-xs text-[var(--muted-foreground)]">{t("subtitleHint")}</p>
        {fieldErrors.subtitle?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">{t("contactEmail")}</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={clinic.contactEmail ?? ""} />
          {fieldErrors.contactEmail?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">{t("contactPhone")}</Label>
          <Input id="contactPhone" name="contactPhone" defaultValue={clinic.contactPhone ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("address")}</Label>
        <Input
          id="address"
          name="address"
          defaultValue={clinic.address ?? ""}
          maxLength={255}
          placeholder={t("addressPlaceholder")}
          aria-invalid={!!fieldErrors.address}
        />
        {fieldErrors.address?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="telegram">{t("telegram")}</Label>
          <Input
            id="telegram"
            name="telegram"
            defaultValue={clinic.telegram ?? ""}
            maxLength={120}
            placeholder={t("telegramPlaceholder")}
            aria-invalid={!!fieldErrors.telegram}
          />
          {fieldErrors.telegram?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="facebookPage">{t("facebookPage")}</Label>
          <Input
            id="facebookPage"
            name="facebookPage"
            defaultValue={clinic.facebookPage ?? ""}
            maxLength={255}
            placeholder={t("facebookPagePlaceholder")}
            aria-invalid={!!fieldErrors.facebookPage}
          />
          {fieldErrors.facebookPage?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("customFields")}</Label>
          <Button type="button" size="sm" variant="outline" onClick={addCustomField}>
            <Plus className="size-4" /> {t("customFieldAdd")}
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">{t("customFieldsHint")}</p>

        {customFields.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
            {t("customFieldsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {customFields.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input
                  aria-label={t("customFieldLabel")}
                  placeholder={t("customFieldLabel")}
                  value={row.label}
                  maxLength={60}
                  onChange={(e) => updateCustomField(i, { label: e.target.value })}
                  className="sm:max-w-[40%]"
                />
                <Input
                  aria-label={t("customFieldValue")}
                  placeholder={t("customFieldValue")}
                  value={row.value}
                  maxLength={255}
                  onChange={(e) => updateCustomField(i, { value: e.target.value })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("customFieldRemove")}
                  onClick={() => removeCustomField(i)}
                >
                  <Trash2 className="size-4 text-[var(--destructive)]" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {fieldErrors.customFields?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {t("saved")}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
