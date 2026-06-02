import { z } from "zod";

const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const optInt = (max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(max).optional());
const optNum = (max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().min(0).max(max).optional());

export const vitalsSchema = z.object({
  systolic: optInt(400),
  diastolic: optInt(400),
  pulse: optInt(400),
  temperature: optNum(60),
  heightCm: optNum(300),
  weightKg: optNum(700),
  oxygenSaturation: optInt(100),
});
export type VitalsInput = z.infer<typeof vitalsSchema>;

/** True when at least one vital sign was actually entered. */
export function hasAnyVital(v: VitalsInput | undefined): boolean {
  if (!v) return false;
  return Object.values(v).some((x) => x !== undefined);
}

const recordFields = {
  visitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  status: z.enum(["draft", "finalized"]).optional(),
  chiefComplaint: optionalText,
  subjective: optionalText,
  objective: optionalText,
  assessment: optionalText,
  plan: optionalText,
  diagnosis: optionalText,
  treatmentPlan: optionalText,
  clinicalNotes: optionalText,
};

export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  ...recordFields,
  vitals: vitalsSchema.partial().optional(),
});
export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;

export const updateMedicalRecordSchema = z.object(recordFields);
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;

export const addVitalsSchema = z.object({
  patientId: z.string().uuid(),
  medicalRecordId: z.string().uuid().optional(),
  ...vitalsSchema.shape,
});
export type AddVitalsInput = z.infer<typeof addVitalsSchema>;
