"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setDoctorAvatar } from "@/server/actions/doctors";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

/** Avatar bubble with an inline "change photo" upload (write-gated by caller). */
export function AvatarUploader({
  clinicId,
  doctorId,
  avatarUrl,
  fallback,
}: {
  clinicId: string;
  doctorId: string;
  avatarUrl: string | null;
  fallback: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const path = `${clinicId}/${doctorId}/avatar-${crypto.randomUUID()}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("doctor-avatars")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const res = await setDoctorAvatar(doctorId, path);
      if (!res.ok) {
        await supabase.storage.from("doctor-avatars").remove([path]);
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] text-3xl font-semibold text-[var(--muted-foreground)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          fallback || "Dr"
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} disabled={busy} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        title="Change photo"
      >
        {busy ? "…" : "Edit"}
      </button>
      {error && <p className="absolute left-0 top-16 w-40 text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
