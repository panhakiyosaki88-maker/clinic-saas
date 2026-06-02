import { z } from "zod";

const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const prescriptionItemSchema = z.object({
  medicineName: z.string().trim().min(1, "Medicine is required").max(255),
  dosage: optionalShort,
  frequency: optionalShort,
  duration: optionalShort,
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  quantity: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(100000).optional()),
});
export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  doctorId: z.string().uuid().optional().or(z.literal("")),
  medicalRecordId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(prescriptionItemSchema).min(1, "Add at least one medicine"),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
