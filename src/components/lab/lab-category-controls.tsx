"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Download, Plus } from "lucide-react";
import { createLabCategory, deleteLabCategory, seedLabPanelCategories } from "@/server/actions/lab";
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

/** Inline input to add a subgroup directly under a group. */
export function AddSubgroupForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const t = useTranslations("lab.category");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    startTransition(async () => {
      const res = await createLabCategory({ name, description: "", parentId: groupId });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 px-4 py-2">
      <Input name="name" placeholder={t("addSubgroup")} className="h-8 max-w-xs" required />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Plus className="h-4 w-4" /> {pending ? t("adding") : t("addSub")}
      </Button>
      {error && <span className="text-xs text-[var(--destructive)]">{error}</span>}
    </form>
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
