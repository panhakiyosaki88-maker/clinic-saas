"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { setDoctorAvatar } from "@/server/actions/doctors";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from "@/lib/uploads";
import { ImageCropper } from "@/components/ui/image-cropper";

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
  const t = useTranslations("doctors.profile");
  const tc = useTranslations("common");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editSrc, setEditSrc] = React.useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t("chooseImage"));
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(tc("fileTooLarge", { max: MAX_IMAGE_UPLOAD_MB }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onConfirm(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const path = `${clinicId}/${doctorId}/avatar-${crypto.randomUUID()}.png`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("doctor-avatars")
        .upload(path, blob, { upsert: false, contentType: "image/png" });
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
      setEditSrc(null);
      router.refresh();
    } finally {
      setBusy(false);
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
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        title={t("changePhoto")}
      >
        {busy ? "…" : t("edit")}
      </button>
      {error && <p className="absolute left-0 top-16 w-40 text-xs text-[var(--destructive)]">{error}</p>}
      {editSrc && (
        <ImageCropper
          src={editSrc}
          aspect={1}
          cropShape="round"
          maxSize={512}
          busy={busy}
          onCancel={() => setEditSrc(null)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
