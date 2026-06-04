"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createLabCategory } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClass =
  "flex h-9 rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface GroupOption { id: string; name: string }

export function CategoryForm({ groups }: { groups: GroupOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const result = await createLabCategory({
        name: String(f.get("name") ?? ""),
        description: String(f.get("description") ?? ""),
        parentId: String(f.get("parentId") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <select name="parentId" className={selectClass} defaultValue="">
        <option value="">— Top-level group —</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>Under: {g.name}</option>
        ))}
      </select>
      <Input name="name" placeholder="Name *" className="max-w-xs" required />
      <Input name="description" placeholder="Description" className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
      {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
    </form>
  );
}
