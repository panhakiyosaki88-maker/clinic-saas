"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "@/server/actions/members";
import type { AssignableRole } from "@/lib/db/queries/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]";

export function InviteForm({ roles }: { roles: AssignableRole[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await inviteMember({
        email: String(data.get("email") ?? ""),
        // roleKey is validated server-side against the assignable set.
        roleKey: String(data.get("roleKey") ?? "") as never,
      });
      if (!result.ok) {
        setMessage({ kind: "err", text: result.error });
        return;
      }
      setMessage({
        kind: "ok",
        text:
          result.data.status === "active"
            ? "Member added."
            : "Invitation recorded — they'll join after signing up.",
      });
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="colleague@clinic.com" required />
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
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite"}
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
    </form>
  );
}
