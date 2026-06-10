import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/cron (cron routes authenticate via CRON_SECRET, not a session)
     * - api/telegram (webhook authenticates via the Telegram secret header)
     * - _next/static, _next/image, favicon.ico
     * - public asset extensions
     */
    "/((?!api/cron|api/telegram|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
