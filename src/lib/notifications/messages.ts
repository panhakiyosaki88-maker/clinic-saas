import type { NotificationStatus } from "@/types/database";

/** Human-friendly result message for a send attempt (client-safe). */
export function statusMessage(status: NotificationStatus): string {
  switch (status) {
    case "sent":
      return "Sent ✓";
    case "skipped":
      return "Logged — email isn't configured yet (set RESEND_API_KEY in Vercel).";
    case "failed":
      return "Send failed — see the notifications log.";
    default:
      return "Recorded.";
  }
}
