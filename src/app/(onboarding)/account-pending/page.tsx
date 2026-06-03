import { redirect } from "next/navigation";
import { Clock, ShieldX } from "lucide-react";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getAccountStatus } from "@/lib/auth/account";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Awaiting approval" };

export default async function AccountPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Already cleared (approved, or onboarded) → send them on.
  const { clinic_id, role } = getClinicClaims(user);
  if (role === "super_admin") redirect("/admin");
  const status = await getAccountStatus();
  if (status === "approved") redirect(clinic_id ? "/dashboard" : "/onboarding");

  const rejected = status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div
            className={`mx-auto mb-2 flex size-12 items-center justify-center rounded-full ${
              rejected
                ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                : "bg-[var(--primary)]/10 text-[var(--primary)]"
            }`}
          >
            {rejected ? <ShieldX className="size-6" /> : <Clock className="size-6" />}
          </div>
          <CardTitle className="text-xl">
            {rejected ? "Account not approved" : "Awaiting approval"}
          </CardTitle>
          <CardDescription>
            {rejected ? (
              <>
                Your account request was declined by an administrator. If you
                believe this is a mistake, please contact support.
              </>
            ) : (
              <>
                Thanks for signing up, {user.email}. A platform administrator
                needs to approve your account before you can set up your clinic.
                You&apos;ll be able to continue here once it&apos;s approved.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignOutButton />
        </CardContent>
      </Card>
    </main>
  );
}
