import { z } from "zod";

export const IMAGING_STATUSES = ["requested", "scheduled", "performed", "reported", "cancelled"] as const;
export type ImagingStatusValue = (typeof IMAGING_STATUSES)[number];
export const IMAGING_STATUS_LABELS: Record<ImagingStatusValue, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  performed: "Performed",
  reported: "Reported",
  cancelled: "Cancelled",
};

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));
const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));

// -- Categories ---------------------------------------------------------------
export const imagingCategorySchema = z.object({
  name: z.string().trim().min(2, "imaging.categoryNameRequired").max(120),
  description: optionalShort,
  parentId: z.string().uuid().optional().or(z.literal("")),
});
export type ImagingCategoryInput = z.infer<typeof imagingCategorySchema>;

// -- Catalog service ----------------------------------------------------------
export const imagingServiceSchema = z.object({
  name: z.string().trim().min(1, "imaging.nameRequired").max(255),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  modality: z.string().trim().max(60).optional().or(z.literal("")),
  defaultPrice: money,
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
export type ImagingServiceInput = z.infer<typeof imagingServiceSchema>;

// -- Request ------------------------------------------------------------------
export const createImagingRequestSchema = z.object({
  patientId: z.string().uuid("imaging.patientRequired"),
  doctorId: z.string().uuid().optional().or(z.literal("")),
  branchId: z.string().uuid().optional().or(z.literal("")),
  // One or more catalog studies (by name); each becomes its own request row.
  serviceNames: z.array(z.string().trim().min(1).max(255)).min(1, "imaging.selectStudy").max(50),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CreateImagingRequestInput = z.infer<typeof createImagingRequestSchema>;

export const changeImagingStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(IMAGING_STATUSES),
});
export type ChangeImagingStatusInput = z.infer<typeof changeImagingStatusSchema>;

// -- Result (findings / impression / report) ----------------------------------
export const saveImagingResultSchema = z.object({
  requestId: z.string().uuid(),
  findings: z.string().trim().max(5000).optional().or(z.literal("")),
  impression: z.string().trim().max(5000).optional().or(z.literal("")),
  reportText: z.string().trim().max(10000).optional().or(z.literal("")),
});
export type SaveImagingResultInput = z.infer<typeof saveImagingResultSchema>;

// -- File attachment ----------------------------------------------------------
export const addImagingFileSchema = z.object({
  requestId: z.string().uuid(),
  filePath: z.string().trim().min(1).max(512),
  fileName: optionalShort,
});
export type AddImagingFileInput = z.infer<typeof addImagingFileSchema>;
