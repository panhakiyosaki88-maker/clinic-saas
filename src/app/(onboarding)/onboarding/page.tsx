import { redirect } from "next/navigation";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getAccountStatus } from "@/lib/auth/account";
import { getPendingInvitationByEmail } from "@/lib/db/invitations";
import { OnboardingForm } from "@/components/clinic/onboarding-form";
import { AcceptInvite } from "@/components/members/accept-invite";
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

  // Already onboarded → straight to the app.
  const { clinic_id, role } = getClinicClaims(user);
  if (clinic_id) redirect("/dashboard");

  // Awaiting Super Admin approval → cannot create a clinic yet.
  if (role !== "super_admin" && (await getAccountStatus()) !== "approved") {
    redirect("/account-pending");
  }

  // Invited by an existing clinic? Offer to accept instead of creating one.
  const invitation = user.email ? await getPendingInvitationByEmail(user.email) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-lg">
        {invitation ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl">You&apos;ve been invited</CardTitle>
              <CardDescription>
                Join <strong>{invitation.clinicName}</strong> as {invitation.roleName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptInvite />
            </CardContent>
          </>
        ) : (
          <>
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
          </>
        )}
      </Card>
    </main>
  );
}
