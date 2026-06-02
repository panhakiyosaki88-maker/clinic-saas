import { HeartPulse } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  clinic_owner: "Clinic Owner",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  cashier: "Cashier",
  accountant: "Accountant",
  super_admin: "Super Admin",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Branded welcome band — medical mark, clinic identity, role-aware greeting. */
export function BrandingHeader({
  clinicName,
  plan,
  userName,
  role,
}: {
  clinicName: string;
  plan: string | null;
  userName: string;
  role: string | null;
}) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const name = userName?.split(" ")[0] || "there";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white dark:border-slate-800">
      <div className="absolute -right-8 -top-8 opacity-10">
        <HeartPulse className="size-40" />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <HeartPulse className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100">{clinicName}</p>
              <h1 className="text-xl font-bold leading-tight">{greeting()}, {name}</h1>
            </div>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-blue-100">{today}</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            {role && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
                {ROLE_LABEL[role] ?? role}
              </span>
            )}
            {plan && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium capitalize">{plan} plan</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
