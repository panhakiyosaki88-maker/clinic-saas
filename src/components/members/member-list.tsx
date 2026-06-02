"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { changeMemberRole, disableMember } from "@/server/actions/members";
import type { MemberRow, AssignableRole } from "@/lib/db/queries/members";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-8 rounded-md border border-[var(--input)] bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:opacity-50";

function StatusBadge({ status }: { status: MemberRow["status"] }) {
  const label = status[0].toUpperCase() + status.slice(1);
  const tone =
    status === "active"
      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
      : status === "invited"
        ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
        : "bg-[var(--destructive)]/10 text-[var(--destructive)]";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

export function MemberList({
  members,
  roles,
  canManage,
}: {
  members: MemberRow[];
  roles: AssignableRole[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  function onRoleChange(membershipId: string, roleKey: string) {
    setPendingId(membershipId);
    startAction(() => changeMemberRole({ membershipId, roleKey: roleKey as never }));
  }
  function onDisable(membershipId: string) {
    setPendingId(membershipId);
    startAction(() => disableMember({ membershipId }));
  }
  function startAction(run: () => Promise<unknown>) {
    run().finally(() => {
      setPendingId(null);
      router.refresh();
    });
  }

  if (members.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No staff yet.</p>;
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{m.full_name ?? m.email ?? "—"}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{m.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={m.status} />
            {canManage ? (
              <select
                className={selectClass}
                defaultValue={m.role_key}
                disabled={pendingId === m.id}
                onChange={(e) => onRoleChange(m.id, e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm">{m.role_name}</span>
            )}
            {canManage && m.status !== "disabled" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pendingId === m.id}
                onClick={() => onDisable(m.id)}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
