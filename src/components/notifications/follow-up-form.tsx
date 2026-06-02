"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { sendFollowUp } from "@/server/actions/notifications";
import { statusMessage } from "@/lib/notifications/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FollowUpForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const form = e.currentTarget;
    const message = String(new FormData(form).get("message") ?? "");
    startTransition(async () => {
      const result = await sendFollowUp({ patientId, message });
      if (!result.ok) {
        setMsg(result.error);
        return;
      }
      setMsg(statusMessage(result.data.status));
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Textarea name="message" placeholder="Follow-up message to the patient…" className="min-h-[56px]" required />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send follow-up"}
        </Button>
        {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
      </div>
    </form>
  );
}
