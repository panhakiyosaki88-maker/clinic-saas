import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PendingInvitation {
  clinicName: string;
  roleName: string;
}

/**
 * Looks up a pending invitation for an email. Uses the admin client because an
 * un-onboarded user has no clinic_id claim, so RLS would hide the membership.
 */
export async function getPendingInvitationByEmail(
  email: string
): Promise<PendingInvitation | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("id, clinics ( name ), roles ( name )")
    .eq("invited_email", email.toLowerCase())
    .eq("status", "invited")
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as {
    clinics: { name: string } | null;
    roles: { name: string } | null;
  };
  return {
    clinicName: row.clinics?.name ?? "a clinic",
    roleName: row.roles?.name ?? "team member",
  };
}
