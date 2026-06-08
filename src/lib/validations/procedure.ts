import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));

export const procedureSchema = z.object({
  name: z.string().trim().min(1, "procedure.nameRequired").max(255),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  defaultPrice: money,
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
export type ProcedureInput = z.infer<typeof procedureSchema>;
