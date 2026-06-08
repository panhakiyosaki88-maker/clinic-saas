import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getAccountStatus } from "@/lib/auth/account";
import { getPendingInvitationByEmail } from "@/lib/db/invitations";
import { OnboardingForm } from "@/components/clinic/onboarding-form";
import { AcceptInvite } from "@/components/members/accept-invite";
import { LanguageToggle } from "@/components/settings/language-toggle";
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
  const t = await getTranslations("auth.onboarding");

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-lg">
        {invitation ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{t("invitedTitle")}</CardTitle>
              <CardDescription>
                {t.rich("invitedDescription", {
                  clinic: invitation.clinicName,
                  role: invitation.roleName,
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptInvite />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{t("setupTitle")}</CardTitle>
              <CardDescription>
                {t("setupDescription")}
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
