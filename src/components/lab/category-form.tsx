"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createLabCategory } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CategoryForm() {
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
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <Input name="name" placeholder="Category name *" className="max-w-xs" required />
      <Input name="description" placeholder="Description" className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
      {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
    </form>
  );
}
