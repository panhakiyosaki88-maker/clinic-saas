import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import type { Database, SubscriptionPlan } from "@/types/database";

export type AdminClinic = Database["public"]["Tables"]["clinics"]["Row"];
export type AdminAuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export interface PlatformStats {
  clinics: number;
  patients: number;
  users: number;
  byPlan: { plan: string; count: number }[];
}

export async function getPlatformStats(): Promise<PlatformStats> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const [clinics, patients, users, subs] = await Promise.all([
    admin.from("clinics").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("plan"),
  ]);

  const byPlanMap = new Map<string, number>();
  for (const s of subs.data ?? []) byPlanMap.set(s.plan, (byPlanMap.get(s.plan) ?? 0) + 1);

  return {
    clinics: clinics.count ?? 0,
    patients: patients.count ?? 0,
    users: users.count ?? 0,
    byPlan: [...byPlanMap.entries()].map(([plan, count]) => ({ plan, count })),
  };
}

export interface ClinicWithSubscription extends AdminClinic {
  plan: SubscriptionPlan | null;
  sub_status: string | null;
}

export async function listAllClinics(): Promise<ClinicWithSubscription[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinics")
    .select("*, subscriptions ( plan, status )")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as (AdminClinic & {
    subscriptions: { plan: SubscriptionPlan; status: string } | null;
  })[]).map((c) => ({
    ...c,
    plan: c.subscriptions?.plan ?? null,
    sub_status: c.subscriptions?.status ?? null,
  }));
}

export interface AdminClinicDetail {
  clinic: AdminClinic;
  subscription: Database["public"]["Tables"]["subscriptions"]["Row"] | null;
  patientCount: number;
  memberCount: number;
}

export async function getClinicForAdmin(clinicId: string): Promise<AdminClinicDetail | null> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data: clinic } = await admin.from("clinics").select("*").eq("id", clinicId).maybeSingle();
  if (!clinic) return null;

  const [{ data: subscription }, patients, members] = await Promise.all([
    admin.from("subscriptions").select("*").eq("clinic_id", clinicId).maybeSingle(),
    admin.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).is("deleted_at", null),
    admin.from("memberships").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).is("deleted_at", null),
  ]);

  return {
    clinic,
    subscription: subscription ?? null,
    patientCount: patients.count ?? 0,
    memberCount: members.count ?? 0,
  };
}

export async function listRecentAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export async function listAllUsers(limit = 200): Promise<AdminUser[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
