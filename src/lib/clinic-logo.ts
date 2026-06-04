/**
 * Builds the public URL for a clinic's logo from its stored object path.
 *
 * Logos live in the PUBLIC `clinic-logos` bucket (migration 0021), so the URL
 * is stable and needs no signing — it can render anywhere the clinic appears,
 * on the server or the client. Returns null when no logo is set.
 */
export function clinicLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/clinic-logos/${logoPath}`;
}
