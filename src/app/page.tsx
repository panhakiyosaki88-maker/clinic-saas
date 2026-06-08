import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations("landing");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--background)] p-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--primary)]">
          {t("brand")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("tagline")}
        </h1>
        <p className="mx-auto max-w-xl text-[var(--muted-foreground)]">
          {t("description")}
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/onboarding">{t("getStarted")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </div>
    </main>
  );
}
