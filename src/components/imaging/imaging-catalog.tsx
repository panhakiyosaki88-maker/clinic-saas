"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Plus, Download } from "lucide-react";
import {
  createImagingCategory,
  deleteImagingCategory,
  createImagingService,
  deleteImagingService,
  seedImagingCatalog,
} from "@/server/actions/imaging";
import { IMAGING_MODALITIES } from "@/lib/imaging/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface CatalogCategory { id: string; name: string }
export interface CatalogService {
  id: string;
  name: string;
  modality: string | null;
  default_price: number;
  category_id: string | null;
  is_active: boolean;
}

export function ImagingCatalog({
  categories,
  services,
}: {
  categories: CatalogCategory[];
  services: CatalogService[];
}) {
  const router = useRouter();
  const t = useTranslations("imaging.catalog");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  const catName = React.useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  function addCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    startTransition(async () => {
      const res = await createImagingCategory({ name, description: "", parentId: "" });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    });
  }

  function addService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await createImagingService({
        name: String(f.get("name") ?? ""),
        categoryId: String(f.get("categoryId") ?? ""),
        modality: String(f.get("modality") ?? ""),
        code: "",
        defaultPrice: Number(f.get("defaultPrice") ?? 0),
        description: "",
        isActive: true,
      });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    });
  }

  function seed() {
    setMsg(null);
    startTransition(async () => {
      const res = await seedImagingCatalog();
      if (!res.ok) return setError(res.error);
      setMsg(res.data.created > 0 ? t("seeded", { count: res.data.created }) : t("upToDate"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={seed}>
          <Download className="h-4 w-4" /> {pending ? t("seeding") : t("seed")}
        </Button>
        {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
        {error && <span className="text-xs text-[var(--destructive)]">{error}</span>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("categories")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addCategory} className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="catName">{t("categoryName")}</Label>
              <Input id="catName" name="name" required placeholder={t("categoryPlaceholder")} />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={pending}><Plus className="h-4 w-4" /> {t("add")}</Button>
          </form>
          <ul className="divide-y divide-[var(--border)]">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span>{c.name}</span>
                <Button
                  type="button" size="icon" variant="ghost"
                  className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(t("deleteCategoryConfirm", { name: c.name }))) return;
                    startTransition(async () => { await deleteImagingCategory(c.id); router.refresh(); });
                  }}
                ><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
            {categories.length === 0 && <li className="py-2 text-sm text-[var(--muted-foreground)]">{t("noCategories")}</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("studies")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addService} className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="svcName">{t("studyName")}</Label>
              <Input id="svcName" name="name" required placeholder={t("studyPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svcCat">{t("category")}</Label>
              <select id="svcCat" name="categoryId" className={selectClass} defaultValue="">
                <option value="">{t("uncategorized")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svcMod">{t("modality")}</Label>
              <select id="svcMod" name="modality" className={selectClass} defaultValue="">
                <option value="">—</option>
                {IMAGING_MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svcPrice">{t("price")}</Label>
              <Input id="svcPrice" name="defaultPrice" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}><Plus className="h-4 w-4" /> {t("addStudy")}</Button>
            </div>
          </form>

          <ul className="divide-y divide-[var(--border)]">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                    {[s.category_id ? catName.get(s.category_id) : null, s.modality].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-[var(--muted-foreground)]">{s.default_price.toFixed(2)}</span>
                  <Button
                    type="button" size="icon" variant="ghost"
                    className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(t("deleteStudyConfirm", { name: s.name }))) return;
                      startTransition(async () => { await deleteImagingService(s.id); router.refresh(); });
                    }}
                  ><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
            {services.length === 0 && <li className="py-2 text-sm text-[var(--muted-foreground)]">{t("noStudies")}</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
