import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/** Auth pages are for signed-out users; bounce anyone already logged in. */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
