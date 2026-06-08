import { z } from "zod";

/** Roles a clinic admin may assign to staff (super_admin is platform-only). */
export const ASSIGNABLE_ROLE_KEYS = [
  "clinic_owner",
  "doctor",
  "nurse",
  "receptionist",
  "cashier",
  "accountant",
] as const;

export const roleKeySchema = z.enum(ASSIGNABLE_ROLE_KEYS);
export type AssignableRoleKey = z.infer<typeof roleKeySchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email("invalidEmail"),
  roleKey: roleKeySchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/** Clinic owner creates a ready-to-use staff login (email + password). */
export const createStaffSchema = z.object({
  name: z.string().min(2, "staff.nameRequired").max(120),
  email: z.string().email("invalidEmail"),
  password: z
    .string()
    .min(8, "staff.passwordMin")
    .max(72, "staff.passwordMax"),
  roleKey: roleKeySchema,
  phone: z.string().max(40).optional().or(z.literal("")),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const changeRoleSchema = z.object({
  membershipId: z.string().uuid(),
  roleKey: roleKeySchema,
});
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const membershipIdSchema = z.object({
  membershipId: z.string().uuid(),
});
