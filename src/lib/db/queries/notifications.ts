import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database, NotificationChannel, NotificationStatus, NotificationType } from "@/types/database";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export interface NotificationRow extends Notification {
  patient_name: string | null;
}

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  q?: string;
  from?: string; // ISO date (inclusive)
  to?: string; // ISO date (inclusive)
}

const SELECT = `*, patients ( full_name )`;

type Joined = Notification & { patients: { full_name: string } | null };

export async function listNotifications(filters: NotificationFilters = {}, limit = 200): Promise<NotificationRow[]> {
  const supabase = await createClient();
  let query = supabase.from("notifications").select(SELECT).order("created_at", { ascending: false }).limit(limit);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.q) query = query.or(`recipient.ilike.%${filters.q}%,subject.ilike.%${filters.q}%`);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Joined[]).map((n) => ({
    ...n,
    patient_name: n.patients?.full_name ?? null,
  }));
}

export async function getNotification(id: string): Promise<NotificationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const n = data as unknown as Joined;
  return { ...n, patient_name: n.patients?.full_name ?? null };
}
