"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2 } from "lucide-react";
import { approveUser, rejectUser, deleteUser } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UserControls({
  userId,
  email,
  status,
  isSelf,
}: {
  userId: string;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else {
        setConfirming(false);
        setTyped("");
        router.refresh();
      }
    });
  }

  const matches = !!email && typed.trim().toLowerCase() === email.toLowerCase();

  // The current Super Admin can't delete their own account.
  if (isSelf) {
    return <span className="text-xs text-[var(--muted-foreground)]">You</span>;
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[var(--muted-foreground)]">
          Type <span className="font-mono font-medium text-[var(--foreground)]">{email}</span> to permanently delete this account and its data.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Confirm email"
            autoFocus
            className="h-8 w-56"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || !matches}
            onClick={() => run(() => deleteUser({ userId, confirmEmail: typed }))}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setConfirming(false);
              setTyped("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "approved" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => approveUser({ userId }))}>
          <Check /> Approve
        </Button>
      )}
      {status === "pending" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => rejectUser({ userId }))}>
          <X /> Reject
        </Button>
      )}
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
        <Trash2 /> Delete
      </Button>
      {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
