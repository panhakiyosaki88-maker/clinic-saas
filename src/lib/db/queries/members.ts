import "server-only";
import { createClient } from "@/lib/supabase/server";
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
 * The clinic's staff roster (RLS scopes to the caller's clinic). Joins the
 * membership to its role and, for accepted members, the user's profile.
 */
export async function listMembers(): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      `id, status, invited_email, user_id, created_at,
       roles ( key, name ),
       profiles ( full_name, email )`
    )
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
    profiles: { full_name: string | null; email: string | null } | null;
  };

  return ((data ?? []) as unknown as Joined[]).map((m) => ({
    id: m.id,
    status: m.status,
    invited_email: m.invited_email,
    user_id: m.user_id,
    full_name: m.profiles?.full_name ?? null,
    email: m.profiles?.email ?? m.invited_email ?? null,
    role_key: m.roles?.key ?? "",
    role_name: m.roles?.name ?? "",
    created_at: m.created_at,
  }));
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
