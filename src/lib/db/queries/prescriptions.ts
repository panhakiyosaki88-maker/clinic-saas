import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];
export type PrescriptionItem = Database["public"]["Tables"]["prescription_items"]["Row"];

export interface PrescriptionWithNames extends Prescription {
  patient_name: string;
  patient_number: string;
  doctor_name: string | null;
  item_count: number;
}

const LIST_SELECT = `*, patients ( full_name, patient_number ), doctors ( full_name ), prescription_items ( id )`;

type ListJoined = Prescription & {
  patients: { full_name: string; patient_number: string } | null;
  doctors: { full_name: string } | null;
  prescription_items: { id: string }[] | null;
};

function mapList(rows: ListJoined[]): PrescriptionWithNames[] {
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.full_name ?? "—",
    patient_number: r.patients?.patient_number ?? "",
    doctor_name: r.doctors?.full_name ?? null,
    item_count: r.prescription_items?.length ?? 0,
  }));
}

/** Recent prescriptions across the clinic. */
export async function listPrescriptions(limit = 50): Promise<PrescriptionWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(LIST_SELECT)
    .is("deleted_at", null)
    .order("prescribed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapList((data ?? []) as unknown as ListJoined[]);
}

/** A patient's prescription history. */
export async function listPatientPrescriptions(patientId: string): Promise<PrescriptionWithNames[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(LIST_SELECT)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("prescribed_at", { ascending: false });
  if (error) throw error;
  return mapList((data ?? []) as unknown as ListJoined[]);
}

export interface PrescriptionDetail extends PrescriptionWithNames {
  items: PrescriptionItem[];
  clinic_name: string;
}

export async function getPrescription(id: string): Promise<PrescriptionDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(
      `*, patients ( full_name, patient_number ), doctors ( full_name ),
       clinics ( name ),
       prescription_items ( * )`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Prescription & {
    patients: { full_name: string; patient_number: string } | null;
    doctors: { full_name: string } | null;
    clinics: { name: string } | null;
    prescription_items: PrescriptionItem[] | null;
  };
  const items = (row.prescription_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  return {
    ...row,
    patient_name: row.patients?.full_name ?? "—",
    patient_number: row.patients?.patient_number ?? "",
    doctor_name: row.doctors?.full_name ?? null,
    item_count: items.length,
    items,
    clinic_name: row.clinics?.name ?? "",
  };
}
