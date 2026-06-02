import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--background)] p-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--primary)]">
          Clinic SaaS
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Practice management for doctors &amp; small clinics
        </h1>
        <p className="mx-auto max-w-xl text-[var(--muted-foreground)]">
          Patients, appointments, records, prescriptions, pharmacy and billing —
          one secure, multi-clinic platform.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/onboarding">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
