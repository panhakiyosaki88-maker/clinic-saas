import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));

// -- Catalog service (the `procedures` table) ---------------------------------
export const procedureSchema = z.object({
  name: z.string().trim().min(1, "procedure.nameRequired").max(255),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  defaultPrice: money,
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
export type ProcedureInput = z.infer<typeof procedureSchema>;

// -- Categories ---------------------------------------------------------------
export const procedureCategorySchema = z.object({
  name: z.string().trim().min(2, "procedure.categoryNameRequired").max(120),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
});
export type ProcedureCategoryInput = z.infer<typeof procedureCategorySchema>;

// -- Order workflow -----------------------------------------------------------
export const PROCEDURE_STATUSES = ["ordered", "performed", "completed", "cancelled"] as const;
export type ProcedureStatusValue = (typeof PROCEDURE_STATUSES)[number];
export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatusValue, string> = {
  ordered: "Ordered",
  performed: "Performed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const createProcedureOrderSchema = z.object({
  patientId: z.string().uuid("procedure.patientRequired"),
  doctorId: z.string().uuid().optional().or(z.literal("")),
  branchId: z.string().uuid().optional().or(z.literal("")),
  // One or more catalog procedures (by name); each becomes its own order row.
  serviceNames: z.array(z.string().trim().min(1).max(255)).min(1, "procedure.selectProcedure").max(50),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CreateProcedureOrderInput = z.infer<typeof createProcedureOrderSchema>;

export const changeProcedureStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(PROCEDURE_STATUSES),
});
export type ChangeProcedureStatusInput = z.infer<typeof changeProcedureStatusSchema>;

export const saveProcedureRecordSchema = z.object({
  orderId: z.string().uuid(),
  clinicalNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  outcome: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type SaveProcedureRecordInput = z.infer<typeof saveProcedureRecordSchema>;
