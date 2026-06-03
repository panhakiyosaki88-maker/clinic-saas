import { doctorAvatarUrl, doctorInitials } from "@/lib/doctor-avatar";

/**
 * Renders a doctor's profile photo (public bucket) with an initials fallback.
 * No hooks / no server-only deps, so it works in both server and client trees —
 * use it anywhere a doctor appears. Pass the stored `avatarPath` (from the
 * doctors row / a `doctors ( avatar_path )` join).
 */
export function DoctorAvatar({
  name,
  avatarPath,
  size = 36,
  className = "",
}: {
  name: string;
  avatarPath?: string | null;
  size?: number;
  className?: string;
}) {
  const url = doctorAvatarUrl(avatarPath);
  const dimension = { width: size, height: size };
  const base =
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] font-semibold text-[var(--muted-foreground)]";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={dimension}
        className={`${base} object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      className={`${base} ${className}`}
      aria-hidden
    >
      {doctorInitials(name) || "Dr"}
    </span>
  );
}
