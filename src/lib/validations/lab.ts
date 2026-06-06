import { z } from "zod";

export const LAB_STATUSES = ["requested", "collected", "processing", "completed", "cancelled"] as const;
export const LAB_STATUS_LABELS: Record<(typeof LAB_STATUSES)[number], string> = {
  requested: "Requested",
  collected: "Collected",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(120),
  description: optionalShort,
  parentId: z.string().uuid().optional().or(z.literal("")),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createLabRequestSchema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  doctorId: z.string().uuid().optional().or(z.literal("")),
  branchId: z.string().uuid().optional().or(z.literal("")),
  testNames: z
    .array(z.string().trim().min(1).max(255))
    .min(1, "Select at least one test")
    .max(100),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CreateLabRequestInput = z.infer<typeof createLabRequestSchema>;

export const changeLabStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(LAB_STATUSES),
});
export type ChangeLabStatusInput = z.infer<typeof changeLabStatusSchema>;

/** The three patient-level lab states surfaced on the Laboratory table. */
export const PATIENT_LAB_STATES = ["requested", "processing", "completed"] as const;
export type PatientLabState = (typeof PATIENT_LAB_STATES)[number];
export const PATIENT_LAB_STATE_LABELS: Record<PatientLabState, string> = {
  requested: "Pending",
  processing: "In Progress",
  completed: "Finish",
};

/** Applies one patient-level state to a single lab session (a set of the day's
 *  test request ids). */
export const setLabSessionStatusSchema = z.object({
  requestIds: z.array(z.string().uuid()).min(1, "No tests to update").max(200),
  status: z.enum(PATIENT_LAB_STATES),
});
export type SetLabSessionStatusInput = z.infer<typeof setLabSessionStatusSchema>;

export const addLabResultSchema = z.object({
  requestId: z.string().uuid(),
  resultValue: optionalShort,
  unit: optionalShort,
  referenceRange: optionalShort,
  resultText: z.string().trim().max(2000).optional().or(z.literal("")),
  filePath: optionalShort,
  fileName: optionalShort,
});
export type AddLabResultInput = z.infer<typeof addLabResultSchema>;
