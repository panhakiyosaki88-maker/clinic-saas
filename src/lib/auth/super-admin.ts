import "server-only";
import { requireUser, getClinicClaims } from "@/lib/auth/session";
import type { User } from "@supabase/supabase-js";

/**
 * Guard for the Super Admin portal. The portal uses the service-role admin
 * client (which bypasses RLS), so this app-layer check is the ONLY thing
 * standing between a normal user and cross-clinic data — call it first in
 * every super-admin page and action.
 */
export async function requireSuperAdmin(): Promise<User> {
  const user = await requireUser();
  if (getClinicClaims(user).role !== "super_admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin();
    return true;
  } catch {
    return false;
  }
}
