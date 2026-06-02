import { redirect } from "next/navigation";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { OnboardingForm } from "@/components/clinic/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Set up your clinic" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Already onboarded → straight to the app. (Login route arrives in Module 2;
  // until then this page is reachable with a service-role-seeded session.)
  const { clinic_id } = getClinicClaims(user);
  if (clinic_id) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Set up your clinic</CardTitle>
          <CardDescription>
            Create your clinic workspace. You can add branches, doctors and staff
            once you&apos;re in. You start on a 14-day Starter trial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
