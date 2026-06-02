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
  email: z.string().email("Enter a valid email"),
  roleKey: roleKeySchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const changeRoleSchema = z.object({
  membershipId: z.string().uuid(),
  roleKey: roleKeySchema,
});
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const membershipIdSchema = z.object({
  membershipId: z.string().uuid(),
});
