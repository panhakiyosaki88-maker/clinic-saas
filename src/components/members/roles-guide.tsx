import { getTranslations } from "next-intl/server";
import type { RoleGuideEntry } from "@/lib/db/queries/members";

/**
 * Reference card explaining what each role can do. The capability lists come
 * straight from the database's role → permission mapping (see listRoleGuide),
 * so this stays in sync as the app's permissions evolve.
 */
export async function RolesGuide({ roles }: { roles: RoleGuideEntry[] }) {
  const t = await getTranslations("settings.staff");
  return (
    <div className="space-y-5">
      {roles.map((role) => (
        <div
          key={role.key}
          className="rounded-lg border border-[var(--border)] p-4 last:mb-0"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold">{role.name}</h3>
            {role.description && (
              <p className="text-xs text-[var(--muted-foreground)]">{role.description}</p>
            )}
          </div>

          {role.groups.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              {t("noAccess")}
            </p>
          ) : (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {role.groups.map((g) => (
                <div key={g.category} className="flex gap-2 text-xs">
                  <dt className="w-28 shrink-0 font-medium text-[var(--muted-foreground)]">
                    {g.category}
                  </dt>
                  <dd className="flex-1">{g.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}
