import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireClinic } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";

/**
 * Asks the database whether the current user holds a permission. Uses the same
 * has_permission() function RLS uses, so the app layer and the database can
 * never disagree. Returns false for unauthenticated users.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_permission: permission,
  });
  if (error) return false;
  return data === true;
}

/**
 * Returns the set of permission keys the given role holds — in one query, for
 * building permission-gated navigation without firing one RPC per item.
 * (Super admins are handled by the caller, since they implicitly hold all.)
 */
export async function getRolePermissionKeys(roleKey: string): Promise<Set<string>> {
  if (!roleKey) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("key, role_permissions ( permissions ( key ) )")
    .eq("key", roleKey)
    .is("clinic_id", null)
    .maybeSingle();
  if (error || !data) return new Set();

  const rows = (data as unknown as { role_permissions: { permissions: { key: string } | null }[] | null })
    .role_permissions ?? [];
  return new Set(rows.map((r) => r.permissions?.key).filter((k): k is string => !!k));
}

/**
 * Guard for Server Actions / Server Components: ensures the caller belongs to a
 * clinic AND holds `permission`. Throws otherwise. Returns the clinic context
 * so callers don't have to fetch it again.
 */
export async function requirePermission(permission: Permission) {
  const ctx = await requireClinic(); // throws UNAUTHENTICATED / NO_CLINIC
  const allowed = await hasPermission(permission);
  if (!allowed) throw new Error("FORBIDDEN");
  return ctx;
}
