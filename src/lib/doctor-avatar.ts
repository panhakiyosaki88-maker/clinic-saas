/**
 * Builds the public URL for a doctor's avatar from its stored object path.
 *
 * Avatars live in the PUBLIC `doctor-avatars` bucket (migration 0020), so the URL
 * is stable and needs no signing — it can be rendered anywhere a doctor appears,
 * on the server or the client. Returns null when no avatar is set.
 */
export function doctorAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/doctor-avatars/${avatarPath}`;
}

/** Up to two uppercase initials from a doctor's name (drops Dr./Prof. prefix). */
export function doctorInitials(name: string): string {
  return name
    .replace(/^(dr\.?|prof\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
