import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Your name is required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Password is too long"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;
