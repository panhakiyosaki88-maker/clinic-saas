"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBranch, updateBranch } from "@/server/actions/clinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface BranchFormData {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  isPrimary: boolean;
}

/** Add (no `branch`) or edit (with `branch`) a clinic branch. */
export function BranchForm({ branch }: { branch?: BranchFormData }) {
  const router = useRouter();
  const isEdit = !!branch;
  const alreadyPrimary = branch?.isPrimary ?? false;

  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [makePrimary, setMakePrimary] = React.useState(alreadyPrimary);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      code: String(form.get("code") ?? ""),
      address: String(form.get("address") ?? ""),
      phone: String(form.get("phone") ?? ""),
      isPrimary: makePrimary,
    };

    startTransition(async () => {
      const result = branch
        ? await updateBranch({ id: branch.id, ...payload })
        : await createBranch(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      if (isEdit) {
        router.push("/settings/branches");
      } else {
        formRef.current?.reset();
        setMakePrimary(false);
      }
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Branch name</Label>
          <Input id="name" name="name" defaultValue={branch?.name ?? ""} placeholder="Downtown Branch" aria-invalid={!!fieldErrors.name} required />
          {fieldErrors.name?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" defaultValue={branch?.code ?? ""} placeholder="DT" maxLength={20} aria-invalid={!!fieldErrors.code} />
          {fieldErrors.code?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={branch?.address ?? ""} placeholder="Street, city" maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={branch?.phone ?? ""} placeholder="+855 ..." maxLength={40} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makePrimary}
          disabled={alreadyPrimary}
          onChange={(e) => setMakePrimary(e.target.checked)}
          className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
        />
        <span>Primary location{alreadyPrimary ? " (current)" : ""}</span>
      </label>
      {alreadyPrimary && (
        <p className="-mt-2 text-xs text-[var(--muted-foreground)]">
          To move the primary elsewhere, set another branch as primary.
        </p>
      )}

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save changes" : "Add branch"}
        </Button>
        {isEdit && (
          <Button type="button" variant="outline" asChild>
            <Link href="/settings/branches">Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
