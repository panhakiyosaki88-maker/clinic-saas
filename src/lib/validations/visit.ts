import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));
const optId = z.string().uuid().optional().or(z.literal(""));

export const createVisitSchema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  branchId: optId,
  doctorId: optId,
  appointmentId: optId,
  chiefComplaint: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CreateVisitInput = z.infer<typeof createVisitSchema>;

export const closeVisitSchema = z.object({ visitId: z.string().uuid() });
export type CloseVisitInput = z.infer<typeof closeVisitSchema>;

/** Dispense medicine to a patient (reduces stock + records a billable sale). */
export const dispenseSchema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  visitId: optId,
  medicineId: z.string().uuid("Choose a medicine"),
  branchId: optId,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(100000),
  unitPrice: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).optional()),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});
export type DispenseInput = z.infer<typeof dispenseSchema>;

/** Record a procedure performed during a visit (a billable line). */
export const recordProcedureSchema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  visitId: optId,
  procedureId: optId,
  doctorId: optId,
  name: z.string().trim().min(1, "Procedure name is required").max(255),
  price: money,
  quantity: z.coerce.number().min(0.01).max(100000).default(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type RecordProcedureInput = z.infer<typeof recordProcedureSchema>;
