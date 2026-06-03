"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createBranch } from "@/server/actions/clinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddBranchForm() {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createBranch({
        name: String(form.get("name") ?? ""),
        code: String(form.get("code") ?? ""),
        address: String(form.get("address") ?? ""),
        phone: String(form.get("phone") ?? ""),
        isPrimary: false,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Branch name</Label>
          <Input id="name" name="name" placeholder="Downtown Branch" aria-invalid={!!fieldErrors.name} required />
          {fieldErrors.name?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" placeholder="DT" maxLength={20} aria-invalid={!!fieldErrors.code} />
          {fieldErrors.code?.map((m) => (
            <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" placeholder="Street, city" maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="+855 ..." maxLength={40} />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add branch"}
      </Button>
    </form>
  );
}
