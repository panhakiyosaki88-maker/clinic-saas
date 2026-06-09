"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Download, Plus, Pencil, Check, X } from "lucide-react";
import { createLabCategory, updateLabCategory, deleteLabCategory, seedLabPanelCategories } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Deletes a group (cascades to its subgroups) or a single subgroup. */
export function DeleteCategoryButton({
  id,
  name,
  isGroup,
}: {
  id: string;
  name: string;
  isGroup?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("lab.category");
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const msg = isGroup
      ? t("deleteGroupConfirm", { name })
      : t("deleteConfirm", { name });
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      await deleteLabCategory(id);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
      disabled={pending}
      onClick={onClick}
      aria-label={t("deleteAria", { name })}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

/** Inline input to add a subgroup (test) directly under a group, with a price. */
export function AddSubgroupForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const t = useTranslations("lab.category");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name") ?? "");
    const defaultPrice = Number(f.get("defaultPrice") ?? 0);
    startTransition(async () => {
      const res = await createLabCategory({ name, description: "", parentId: groupId, defaultPrice });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 px-4 py-2">
      <Input name="name" placeholder={t("addSubgroup")} className="h-8 max-w-xs flex-1" required />
      <Input
        name="defaultPrice"
        type="number"
        min="0"
        step="0.01"
        defaultValue="0"
        aria-label={t("price")}
        placeholder={t("price")}
        className="h-8 w-24"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Plus className="h-4 w-4" /> {pending ? t("adding") : t("addSub")}
      </Button>
      {error && <span className="text-xs text-[var(--destructive)]">{error}</span>}
    </form>
  );
}

/** A lab test (subgroup) row: shows name + price, with inline rename/reprice. */
export function LabTestRow({
  test,
  canWrite,
}: {
  test: { id: string; name: string; default_price: number };
  canWrite: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("lab.category");
  const [editing, setEditing] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "");
    const defaultPrice = Number(f.get("defaultPrice") ?? 0);
    startTransition(async () => {
      const res = await updateLabCategory(test.id, { name, defaultPrice });
      if (!res.ok) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="px-4 py-2">
        <form onSubmit={onSave} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-1">
            <label htmlFor={`name-${test.id}`} className="text-xs text-[var(--muted-foreground)]">{t("testName")}</label>
            <Input id={`name-${test.id}`} name="name" defaultValue={test.name} className="h-8" required />
          </div>
          <div className="w-24 space-y-1">
            <label htmlFor={`price-${test.id}`} className="text-xs text-[var(--muted-foreground)]">{t("price")}</label>
            <Input id={`price-${test.id}`} name="defaultPrice" type="number" min="0" step="0.01" defaultValue={test.default_price} className="h-8" />
          </div>
          <Button type="submit" size="sm" disabled={pending}><Check className="h-4 w-4" /> {t("save")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setEditing(false)}><X className="h-4 w-4" /> {t("cancel")}</Button>
          {error && <span className="text-xs text-[var(--destructive)]">{error}</span>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
      <span className="min-w-0 truncate">{test.name}</span>
      <div className="flex shrink-0 items-center gap-2">
        <span className="tabular-nums text-[var(--muted-foreground)]">{test.default_price.toFixed(2)}</span>
        {canWrite && (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={() => { setError(null); setEditing(true); }}
              aria-label={t("editAria", { name: test.name })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteCategoryButton id={test.id} name={test.name} />
          </>
        )}
      </div>
    </li>
  );
}

/** Imports the standard requisition-sheet panel as groups + subgroups. */
export function ImportPanelButton() {
  const router = useRouter();
  const t = useTranslations("lab.category");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  function onClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await seedLabPanelCategories();
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(res.data.created > 0 ? t("imported", { count: res.data.created }) : t("upToDate"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClick}>
        <Download className="h-4 w-4" /> {pending ? t("importing") : t("import")}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </div>
  );
}
