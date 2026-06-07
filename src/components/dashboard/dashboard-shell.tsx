"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccentToggle } from "@/components/accent-toggle";
import { NAV } from "@/components/dashboard/nav-config";
import { BranchSwitcher, type BranchOption } from "@/components/dashboard/branch-switcher";

export function DashboardShell({
  navKeys,
  clinicName,
  clinicSlug,
  logoUrl,
  userName,
  userEmail,
  isSuperAdmin,
  branches,
  activeBranchId,
  children,
}: {
  navKeys: string[];
  clinicName: string;
  clinicSlug: string;
  logoUrl: string | null;
  userName: string;
  userEmail: string;
  isSuperAdmin: boolean;
  branches: BranchOption[];
  activeBranchId: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const items = NAV.filter((n) => navKeys.includes(n.key));
  const initials = (userName || userEmail || "U").slice(0, 2).toUpperCase();

  // Close mobile drawer / menus on route change.
  React.useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) router.push(`/patients?q=${encodeURIComponent(q)}`);
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900",
          collapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={clinicName}
              className="size-8 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {clinicName.slice(0, 1).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{clinicName}</p>
              <p className="truncate text-xs text-slate-400">/{clinicSlug}</p>
            </div>
          )}
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.key}
                href={n.href}
                title={collapsed ? n.label : undefined}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                ].join(" ")}
              >
                <n.icon className="size-5 shrink-0" />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
          {isSuperAdmin && (
            <Link
              href="/admin"
              title={collapsed ? "Platform" : undefined}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
            >
              <Shield className="size-5 shrink-0" />
              {!collapsed && <span>Platform admin</span>}
            </Link>
          )}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden items-center gap-3 border-t border-slate-200 p-3 text-sm text-slate-500 hover:text-slate-900 lg:flex dark:border-slate-800 dark:hover:text-white"
        >
          {collapsed ? <PanelLeft className="size-5" /> : <><PanelLeftClose className="size-5" /> Collapse</>}
        </button>
      </aside>

      {/* Main column */}
      <div className={collapsed ? "lg:pl-16" : "lg:pl-64"}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-6" />
          </button>

          {branches.length > 1 && (
            <BranchSwitcher branches={branches} activeId={activeBranchId} />
          )}

          <form onSubmit={onSearch} className="relative hidden flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              placeholder="Search patients, doctors, invoices…"
              className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800 dark:focus:ring-brand-500/20"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </Link>
            <AccentToggle />
            <ThemeToggle />

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                  {initials}
                </span>
                <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{userName || "Account"}</p>
                      <p className="truncate text-xs text-slate-400">{userEmail}</p>
                    </div>
                    <Link href="/settings/subscription" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                      Subscription
                    </Link>
                    <form action={signOut}>
                      <button type="submit" className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
