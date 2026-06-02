import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** The clinic-scoping claims carried in the JWT's app_metadata. */
export interface ClinicClaims {
  clinic_id: string | null;
  role: string | null;
}

/**
 * Returns the authenticated user, or null. Always uses getUser() (not
 * getSession()) so the token is revalidated against Supabase Auth.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Reads the active clinic_id + role from the user's app_metadata claims.
 * These are stamped during onboarding (Module 2) and travel inside the JWT,
 * so RLS can read them with zero extra queries (see current_clinic_id() in SQL).
 */
export function getClinicClaims(user: User | null): ClinicClaims {
  const meta = (user?.app_metadata ?? {}) as Record<string, unknown>;
  return {
    clinic_id: typeof meta.clinic_id === "string" ? meta.clinic_id : null,
    role: typeof meta.role === "string" ? meta.role : null,
  };
}

/** Throws if there is no authenticated user. Use at the top of Server Actions. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Returns the authenticated user together with a guaranteed clinic_id, or
 * throws. The single guard every clinic-scoped Server Action should call.
 */
export async function requireClinic(): Promise<{ user: User; clinicId: string; role: string | null }> {
  const user = await requireUser();
  const { clinic_id, role } = getClinicClaims(user);
  if (!clinic_id) throw new Error("NO_CLINIC");
  return { user, clinicId: clinic_id, role };
}
