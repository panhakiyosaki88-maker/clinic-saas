import { Phone, Mail, MapPin } from "lucide-react";
import { clinicLogoUrl } from "@/lib/clinic-logo";
import { parseClinicCustomFields } from "@/lib/clinic-profile";

/** The clinic fields a letterhead renders. A subset of the clinics row. */
export interface LetterheadClinic {
  name: string;
  subtitle: string | null;
  logo_path: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  telegram: string | null;
  facebook_page: string | null;
  custom_fields: unknown;
}

/** Telegram brand glyph (paper-plane), tinted with the Telegram blue. */
function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.37.18 1.09 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

/** Facebook brand glyph ("f"), tinted with the Facebook blue. */
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/**
 * Professional clinic letterhead for printed documents (prescriptions,
 * invoices, receipts). Shows the logo, name, tagline and contact details,
 * with brand glyphs beside the Telegram and Facebook links.
 *
 * `align="center"` stacks everything centered (used by the narrow receipt);
 * the default left-aligns logo + details in a row.
 */
export function ClinicLetterhead({
  clinic,
  align = "left",
}: {
  clinic: LetterheadClinic;
  align?: "left" | "center";
}) {
  const logoUrl = clinicLogoUrl(clinic.logo_path);
  const customFields = parseClinicCustomFields(clinic.custom_fields);
  const centered = align === "center";

  const contacts = (
    <div
      className={`mt-1 flex flex-col gap-0.5 text-xs text-[var(--muted-foreground)] ${
        centered ? "items-center" : "items-start"
      }`}
    >
      {clinic.contact_phone && (
        <span className="inline-flex items-center gap-1.5">
          <Phone className="size-3 shrink-0" /> {clinic.contact_phone}
        </span>
      )}
      {clinic.contact_email && (
        <span className="inline-flex items-center gap-1.5">
          <Mail className="size-3 shrink-0" /> {clinic.contact_email}
        </span>
      )}
      {clinic.address && (
        <span className={`inline-flex items-start gap-1.5 ${centered ? "text-center" : ""}`}>
          <MapPin className="size-3 shrink-0 translate-y-0.5" /> <span>{clinic.address}</span>
        </span>
      )}
      {clinic.telegram && (
        <span className="inline-flex items-center gap-1.5">
          <TelegramGlyph className="size-3 shrink-0 text-[#229ED9]" /> {clinic.telegram}
        </span>
      )}
      {clinic.facebook_page && (
        <span className="inline-flex items-center gap-1.5">
          <FacebookGlyph className="size-3 shrink-0 text-[#1877F2]" /> {clinic.facebook_page}
        </span>
      )}
      {customFields.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="font-medium text-[var(--foreground)]">{f.label}:</span> {f.value}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`letterhead flex gap-4 ${
        centered ? "flex-col items-center text-center" : "items-start"
      }`}
    >
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket URL, must print
        <img
          src={logoUrl}
          alt={clinic.name}
          className="size-16 shrink-0 rounded-lg object-contain"
        />
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight">{clinic.name}</h1>
        {clinic.subtitle && (
          <p className="text-sm text-[var(--muted-foreground)]">{clinic.subtitle}</p>
        )}
        {contacts}
      </div>
    </div>
  );
}
