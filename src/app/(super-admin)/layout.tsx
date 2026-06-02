import Link from "next/link";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isSuperAdmin())) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-semibold">Platform</Link>
            <Link href="/admin/clinics" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Clinics</Link>
            <Link href="/admin/users" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Users</Link>
            <Link href="/admin/audit" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Audit log</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
