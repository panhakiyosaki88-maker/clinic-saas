import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClinic } from "@/lib/auth/session";
import type { MembershipStatus } from "@/types/database";

export interface MemberRow {
  id: string;
  status: MembershipStatus;
  invited_email: string | null;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  role_key: string;
  role_name: string;
  created_at: string;
}

/**
 * The clinic's staff roster. Uses the service-role client (scoped to the
 * caller's own clinic) because: (a) there is no FK from memberships.user_id to
 * profiles for PostgREST to embed, and (b) profiles RLS only exposes a user's
 * own row — so co-workers' names/emails are fetched server-side here instead.
 */
export async function listMembers(): Promise<MemberRow[]> {
  const { clinicId } = await requireClinic();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("memberships")
    .select(`id, status, invited_email, user_id, created_at, roles ( key, name )`)
    .eq("clinic_id", clinicId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  type Joined = {
    id: string;
    status: MembershipStatus;
    invited_email: string | null;
    user_id: string | null;
    created_at: string;
    roles: { key: string; name: string } | null;
  };
  const rows = (data ?? []) as unknown as Joined[];

  // Look up profiles for accepted members in one query.
  const userIds = rows.map((r) => r.user_id).filter((id): id is string => !!id);
  const profiles = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of profs ?? []) profiles.set(p.id, { full_name: p.full_name, email: p.email });
  }

  return rows.map((m) => {
    const prof = m.user_id ? profiles.get(m.user_id) : null;
    return {
      id: m.id,
      status: m.status,
      invited_email: m.invited_email,
      user_id: m.user_id,
      full_name: prof?.full_name ?? null,
      email: prof?.email ?? m.invited_email ?? null,
      role_key: m.roles?.key ?? "",
      role_name: m.roles?.name ?? "",
      created_at: m.created_at,
    };
  });
}

export interface AssignableRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

/** System roles (minus super_admin) plus this clinic's custom roles. */
export async function listAssignableRoles(): Promise<AssignableRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, name, description")
    .neq("key", "super_admin")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface RoleGuideEntry {
  key: string;
  name: string;
  description: string | null;
  /** Capabilities grouped by module, derived live from role_permissions. */
  groups: { category: string; items: string[] }[];
}

/**
 * The role reference shown on the Staff page: every assignable role with the
 * concrete capabilities it grants. Built from the role → permission mapping in
 * the database, so it stays accurate automatically whenever roles or their
 * permissions change — there is no hard-coded list of "what each role can do".
 */
export async function listRoleGuide(): Promise<RoleGuideEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select(
      `key, name, description, role_permissions ( permissions ( category, description ) )`
    )
    .neq("key", "super_admin")
    .order("name", { ascending: true });
  if (error) throw error;

  type Row = {
    key: string;
    name: string;
    description: string | null;
    role_permissions:
      | { permissions: { category: string; description: string } | null }[]
      | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    // Group permission descriptions by their module category.
    const byCategory = new Map<string, string[]>();
    for (const rp of r.role_permissions ?? []) {
      const p = rp.permissions;
      if (!p) continue;
      const items = byCategory.get(p.category) ?? [];
      if (!items.includes(p.description)) items.push(p.description);
      byCategory.set(p.category, items);
    }
    const groups = [...byCategory.entries()]
      .map(([category, items]) => ({ category, items: items.sort() }))
      .sort((a, b) => a.category.localeCompare(b.category));
    return { key: r.key, name: r.name, description: r.description, groups };
  });
}
