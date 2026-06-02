import { z } from "zod";

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));
const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));

export const genderSchema = z.enum(["male", "female", "other"]);

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Patient name is required").max(160),
  gender: genderSchema.optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  phone: optionalShort,
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: optionalText,
  occupation: optionalShort,
  emergencyContactName: optionalShort,
  emergencyContactPhone: optionalShort,
  allergies: optionalText,
  medicalHistory: optionalText,
  chronicDiseases: optionalText,
  notes: optionalText,
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

// Edit allows the same fields; all optional.
export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const addTimelineNoteSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(1, "A title is required").max(160),
  description: optionalText,
});
export type AddTimelineNoteInput = z.infer<typeof addTimelineNoteSchema>;

export const recordDocumentSchema = z.object({
  patientId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(255).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});
export type RecordDocumentInput = z.infer<typeof recordDocumentSchema>;

/** Strip characters that would break a PostgREST `or()` filter. */
export function sanitizeSearch(input: string | undefined | null): string {
  return (input ?? "").replace(/[(),%*]/g, "").trim().slice(0, 80);
}
