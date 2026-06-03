import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isSuperAdmin())) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 p-4">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
              <Shield className="size-4" /> Platform admin
            </span>
            <Link href="/admin" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Overview</Link>
            <Link href="/admin/clinics" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Clinics</Link>
            <Link href="/admin/users" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Users</Link>
            <Link href="/admin/audit" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Audit log</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft /> Back to app
              </Link>
            </Button>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
