"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch/active-branch";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "@/lib/validations/auth";
import { ok, fail, type ActionResult } from "./types";

/** Clears the active-branch choice so the next dashboard entry re-prompts the
 *  user to pick the branch they're working at (see the BranchPicker). */
async function clearActiveBranch(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_BRANCH_COOKIE);
}

/**
 * Registers a new user. With email confirmations enabled (production), the
 * user must confirm via the emailed link before a session exists; locally
 * (confirmations off) a session is created immediately. On success the user
 * proceeds to onboarding, where they create their clinic (Module 1).
 */
export async function signUp(
  input: SignUpInput
): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const { fullName, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });

  if (error) return fail(error.message);

  // No session returned => email confirmation is required.
  const needsEmailConfirmation = !data.session;
  revalidatePath("/", "layout");
  return ok({ needsEmailConfirmation });
}

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }
  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail("Invalid email or password.");

  // Fresh login → forget any prior branch choice so the picker shows again.
  await clearActiveBranch();
  revalidatePath("/", "layout");
  return ok(undefined);
}

/** Signs the user out and returns to the login screen. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearActiveBranch();
  revalidatePath("/", "layout");
  redirect("/login");
}
