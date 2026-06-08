"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations("auth.signOut");
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      <LogOut /> {pending ? t("signingOut") : t("signOut")}
    </Button>
  );
}
