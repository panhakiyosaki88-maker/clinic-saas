import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export async function listNotifications(limit = 100): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
