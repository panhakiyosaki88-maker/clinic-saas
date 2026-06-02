import { z } from "zod";

const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const createDoctorSchema = z.object({
  fullName: z.string().trim().min(2, "Doctor name is required").max(160),
  specialization: optionalShort,
  licenseNumber: optionalShort,
  phone: optionalShort,
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  consultationFee: z.preprocess(
    emptyToUndef,
    z.coerce.number().min(0).max(1_000_000).optional()
  ),
  isActive: z.boolean().optional(),
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial();
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

export const scheduleSchema = z
  .object({
    doctorId: z.string().uuid(),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
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
