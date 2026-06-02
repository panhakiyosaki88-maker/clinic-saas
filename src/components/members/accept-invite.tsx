"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/server/actions/members";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AcceptInvite() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitation();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Pick up the freshly stamped clinic_id claim, then enter the app.
      await createClient().auth.refreshSession();
      router.refresh();
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={onAccept} disabled={pending}>
        {pending ? "Joining…" : "Accept & join"}
      </Button>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
