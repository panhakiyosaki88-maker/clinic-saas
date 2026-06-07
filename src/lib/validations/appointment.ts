import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "waiting",
  "in_consultation",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
export type AppointmentStatusValue = z.infer<typeof appointmentStatusSchema>;

export const STATUS_LABELS: Record<AppointmentStatusValue, string> = {
  scheduled: "Scheduled",
  waiting: "Waiting",
  in_consultation: "In Consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));

/** A scheduled appointment requires a date + time; a walk-in defaults to now. */
export const createAppointmentSchema = z
  .object({
    // Messages are i18n keys under the `errors` namespace (see action-errors.ts);
    // the server action localizes them before returning fieldErrors.
    patientId: z.string().uuid("appointment.patientRequired"),
    doctorId: z.string().uuid().optional().or(z.literal("")),
    branchId: z.string().uuid().optional().or(z.literal("")),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "appointment.dateFormat").optional().or(z.literal("")),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "appointment.timeFormat").optional().or(z.literal("")),
    durationMinutes: z.coerce.number().int().min(5).max(480).default(30),
    isWalkIn: z.boolean().optional(),
    reason: optionalText,
  })
  .refine((v) => v.isWalkIn || (!!v.scheduledDate && !!v.scheduledTime), {
    message: "appointment.scheduleRequired",
    path: ["scheduledTime"],
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  doctorId: z.string().uuid().optional().or(z.literal("")),
  branchId: z.string().uuid().optional().or(z.literal("")),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  reason: optionalText,
  notes: optionalText,
});
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const changeStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: appointmentStatusSchema,
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
