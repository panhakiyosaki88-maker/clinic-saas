"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      <LogOut /> {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
