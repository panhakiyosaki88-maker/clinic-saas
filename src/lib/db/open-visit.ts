import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * The patient's current open visit, if any. Clinical create flows (EMR, lab,
 * prescription, dispensing, procedures) call this so records thread onto the
 * encounter automatically — driving the visit timeline and visit-scoped billing.
 * Returns null when the patient has no open visit (the record stays visit-less).
 */
export async function resolveOpenVisitId(
  supabase: SupabaseClient<Database>,
  patientId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("patient_visits")
    .select("id")
    .eq("patient_id", patientId)
    .eq("status", "open")
    .is("deleted_at", null)
    .order("visit_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
