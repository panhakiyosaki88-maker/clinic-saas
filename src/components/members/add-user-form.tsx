"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createStaffUser } from "@/server/actions/members";
import type { AssignableRole } from "@/lib/db/queries/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export function AddUserForm({ roles }: { roles: AssignableRole[] }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await createStaffUser({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        // roleKey is validated server-side against the assignable set.
        roleKey: String(data.get("roleKey") ?? "") as never,
        phone: String(data.get("phone") ?? ""),
      });
      if (!result.ok) {
        setMessage({ kind: "err", text: result.error });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setMessage({ kind: "ok", text: "User created — they can sign in now." });
      form.reset();
      router.refresh();
    });
  }

  function fieldError(name: string) {
    return fieldErrors[name]?.map((m) => (
      <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
    ));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="John Doe" required />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="john@example.com" required />
          {fieldError("email")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
          {fieldError("password")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleKey">Role</Label>
          <select id="roleKey" name="roleKey" className={selectClass} defaultValue="receptionist" required>
            {roles.map((r) => (
              <option key={r.id} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
          {fieldError("roleKey")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" placeholder="012 000 000" />
          {fieldError("phone")}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add User"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            formRef.current?.reset();
            setMessage(null);
            setFieldErrors({});
          }}
        >
          Cancel
        </Button>

        {message && (
          <p
            className={`text-sm ${
              message.kind === "ok" ? "text-[var(--primary)]" : "text-[var(--destructive)]"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
