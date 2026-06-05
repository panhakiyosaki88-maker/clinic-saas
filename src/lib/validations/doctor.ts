import { z } from "zod";

const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

export const genderSchema = z.enum(["male", "female", "other"]);
export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "visiting",
  "locum",
]);

export const createDoctorSchema = z.object({
  fullName: z.string().trim().min(2, "Doctor name is required").max(160),
  branchId: z.string().uuid().optional().or(z.literal("")),
  title: optionalShort,
  specialization: optionalShort,
  subSpecialty: optionalShort,
  licenseNumber: optionalShort,
  phone: optionalShort,
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  consultationFee: z.preprocess(
    emptyToUndef,
    z.coerce.number().min(0).max(1_000_000).optional()
  ),
  gender: genderSchema.optional().or(z.literal("")),
  languages: optionalShort,
  employmentType: employmentTypeSchema.optional().or(z.literal("")),
  yearsExperience: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(0).max(80).optional()
  ),
  joinedOn: dateString,
  room: optionalShort,
  licenseExpiry: dateString,
  licenseVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial();
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

const optionalTime = time.optional().or(z.literal(""));

export const scheduleSchema = z
  .object({
    doctorId: z.string().uuid(),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
    breakStart: optionalTime,
    breakEnd: optionalTime,
    slotMinutes: z.preprocess(emptyToUndef, z.coerce.number().int().min(5).max(240).optional()),
    maxPatients: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(200).optional()),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine((v) => !v.breakStart || !v.breakEnd || v.breakStart < v.breakEnd, {
    message: "Break end must be after break start",
    path: ["breakEnd"],
  })
  .refine(
    (v) =>
      !v.breakStart ||
      !v.breakEnd ||
      (v.breakStart >= v.startTime && v.breakEnd <= v.endTime),
    { message: "Break must fall within the working hours", path: ["breakStart"] }
  );
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const timeOffSchema = z
  .object({
    doctorId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    reason: optionalShort,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });
export type TimeOffInput = z.infer<typeof timeOffSchema>;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// --- Credentials & documents (Phase 2) -------------------------------------

export const doctorDocCategorySchema = z.enum([
  "license",
  "certificate",
  "cv",
  "id",
  "other",
]);

export const recordDoctorDocumentSchema = z.object({
  doctorId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(255).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  category: doctorDocCategorySchema.optional().or(z.literal("")),
});
export type RecordDoctorDocumentInput = z.infer<typeof recordDoctorDocumentSchema>;

export const qualificationSchema = z.object({
  doctorId: z.string().uuid(),
  degree: z.string().trim().min(1, "Degree is required").max(255),
  institution: optionalShort,
  field: optionalShort,
  year: z.preprocess(emptyToUndef, z.coerce.number().int().min(1900).max(2100).optional()),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type QualificationInput = z.infer<typeof qualificationSchema>;

export const licenseSchema = z.object({
  doctorId: z.string().uuid(),
  licenseNumber: z.string().trim().min(1, "License number is required").max(255),
  authority: optionalShort,
  jurisdiction: optionalShort,
  issuedOn: dateString,
  expiryOn: dateString,
  verified: z.boolean().optional(),
});
export type LicenseInput = z.infer<typeof licenseSchema>;
