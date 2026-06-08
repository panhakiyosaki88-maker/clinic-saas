import "server-only";
import { getTranslations } from "next-intl/server";

/**
 * Server-action error localization (the framework used by every Server Action).
 *
 * Convention: Zod schema messages and the curated `fail()` strings are stored as
 * dot-keys under the `errors` message namespace (e.g. "appointment.patientRequired").
 * An action localizes them against the caller's locale — which next-intl resolves
 * from the request cookie — like so:
 *
 *   const te = await getErrorT();
 *   if (!parsed.success) {
 *     return fail(te("fixFields"), localizeFieldErrors(parsed.error.flatten().fieldErrors, te));
 *   }
 *   // curated message:  return fail(te("appointment.createFailed"));
 *
 * Keys that aren't found fall through to the raw string, so schemas/actions can
 * adopt this incrementally without breaking — an un-migrated English message
 * still renders verbatim until its key is added.
 */
export type ErrorT = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

export function getErrorT(): Promise<ErrorT> {
  return getTranslations("errors") as unknown as Promise<ErrorT>;
}

/** Translate a Zod `fieldErrors` map in place, leaving unknown keys untouched. */
export function localizeFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
  te: ErrorT
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.length) out[field] = messages.map((m) => (te.has(m) ? te(m) : m));
  }
  return out;
}
