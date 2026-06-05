import { z } from "zod";

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));
const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));

export const genderSchema = z.enum(["male", "female", "other"]);
export const bloodTypeSchema = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]);
export const maritalStatusSchema = z.enum(["single", "married", "divorced", "widowed", "other"]);
export const idDocTypeSchema = z.enum(["national_id", "passport", "driver_license", "other"]);
export const contactMethodSchema = z.enum(["phone", "sms", "email", "telegram", "none"]);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Patient name is required").max(160),
  branchId: z.string().uuid().optional().or(z.literal("")),
  gender: genderSchema.optional().or(z.literal("")),
  dateOfBirth: dateString,
  phone: optionalShort,
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: optionalText,
  occupation: optionalShort,
  emergencyContactName: optionalShort,
  emergencyContactPhone: optionalShort,
  // enriched demographics & preferences
  bloodType: bloodTypeSchema.optional().or(z.literal("")),
  maritalStatus: maritalStatusSchema.optional().or(z.literal("")),
  nationalIdType: idDocTypeSchema.optional().or(z.literal("")),
  nationalIdNumber: optionalShort,
  preferredLanguage: optionalShort,
  preferredContactMethod: contactMethodSchema.optional().or(z.literal("")),
  doNotContact: z.coerce.boolean().optional(),
  nextOfKinName: optionalShort,
  nextOfKinPhone: optionalShort,
  nextOfKinRelationship: optionalShort,
  // medical profile (legacy free-text, retained)
  allergies: optionalText,
  medicalHistory: optionalText,
  chronicDiseases: optionalText,
  notes: optionalText,
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

// Edit allows the same fields; all optional.
export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const insurancePolicySchema = z.object({
  patientId: z.string().uuid(),
  provider: z.string().trim().min(1, "Provider is required").max(255),
  policyNumber: optionalShort,
  groupNumber: optionalShort,
  coverageStart: dateString,
  coverageEnd: dateString,
  isPrimary: z.coerce.boolean().optional(),
  notes: optionalText,
});
export type InsurancePolicyInput = z.infer<typeof insurancePolicySchema>;

// --- Structured clinical lists (Phase 2) -----------------------------------

export const allergyEntrySchema = z.object({
  patientId: z.string().uuid(),
  substance: z.string().trim().min(1, "Substance is required").max(255),
  reaction: optionalShort,
  severity: z.enum(["mild", "moderate", "severe"]).optional().or(z.literal("")),
  notedAt: dateString,
});
export type AllergyEntryInput = z.infer<typeof allergyEntrySchema>;

export const medicationEntrySchema = z.object({
  patientId: z.string().uuid(),
  name: z.string().trim().min(1, "Medication name is required").max(255),
  dose: optionalShort,
  frequency: optionalShort,
  route: optionalShort,
  startedOn: dateString,
  endedOn: dateString,
  status: z.enum(["active", "stopped", "completed"]).optional().or(z.literal("")),
});
export type MedicationEntryInput = z.infer<typeof medicationEntrySchema>;

export const immunizationEntrySchema = z.object({
  patientId: z.string().uuid(),
  vaccine: z.string().trim().min(1, "Vaccine is required").max(255),
  doseLabel: optionalShort,
  givenOn: dateString,
  nextDueOn: dateString,
  provider: optionalShort,
});
export type ImmunizationEntryInput = z.infer<typeof immunizationEntrySchema>;

export const conditionEntrySchema = z.object({
  patientId: z.string().uuid(),
  condition: z.string().trim().min(1, "Condition is required").max(255),
  status: z.enum(["active", "resolved", "inactive"]).optional().or(z.literal("")),
  diagnosedOn: dateString,
  resolvedOn: dateString,
  notes: optionalText,
});
export type ConditionEntryInput = z.infer<typeof conditionEntrySchema>;

// --- Engagement: consent, tags (Phase 3) -----------------------------------

export const consentEntrySchema = z.object({
  patientId: z.string().uuid(),
  consentType: z.string().trim().min(1, "Consent type is required").max(120),
  granted: z.coerce.boolean(),
  signedOn: dateString,
  notes: optionalText,
});
export type ConsentEntryInput = z.infer<typeof consentEntrySchema>;

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(60),
  color: optionalShort,
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const assignTagSchema = z.object({
  patientId: z.string().uuid(),
  tagId: z.string().uuid(),
});
export type AssignTagInput = z.infer<typeof assignTagSchema>;

export const addTimelineNoteSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(1, "A title is required").max(160),
  description: optionalText,
});
export type AddTimelineNoteInput = z.infer<typeof addTimelineNoteSchema>;

export const documentCategorySchema = z.enum([
  "scan",
  "report",
  "x_ray",
  "consent",
  "insurance",
  "other",
]);

export const recordDocumentSchema = z.object({
  patientId: z.string().uuid(),
  medicalRecordId: z.string().uuid().optional(),
  filePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(255).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  category: documentCategorySchema.optional().or(z.literal("")),
});
export type RecordDocumentInput = z.infer<typeof recordDocumentSchema>;

/** Strip characters that would break a PostgREST `or()` filter. */
export function sanitizeSearch(input: string | undefined | null): string {
  return (input ?? "").replace(/[(),%*]/g, "").trim().slice(0, 80);
}
