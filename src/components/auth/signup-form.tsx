"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signUp({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      if (result.data.needsEmailConfirmation) {
        setConfirmEmail(true);
        return;
      }
      // Session created immediately → go set up the clinic.
      router.refresh();
      router.push("/onboarding");
    });
  }

  if (confirmEmail) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm">
          Check your inbox to confirm your email, then sign in to continue.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required autoFocus />
        {fieldErrors.fullName?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {fieldErrors.email?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {fieldErrors.password?.map((m) => (
          <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
