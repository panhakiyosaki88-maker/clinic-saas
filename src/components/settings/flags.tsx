import type { Locale } from "@/i18n/config";

/**
 * Small inline SVG flags for the language switch. Inline (not emoji) so they
 * render consistently on Windows/Chrome where flag emoji fall back to letters.
 * Simplified for tiny sizes but recognizable.
 */

// The `!` suffix (Tailwind v4 important) overrides the icon-button rule
// ([&_svg]:size-4) so the flag keeps its 3:2 rectangle instead of being forced
// into a 16×16 square.
const baseClass = "block h-3.5! w-5! shrink-0 rounded-[2px] shadow-sm";

/** United States — used for English. */
export function USFlag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="English"
    >
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <rect width="10" height={(16 / 13) * 7} fill="#3c3b6e" />
      <g fill="#fff">
        {[1, 3, 5].map((r) =>
          [1, 3, 5, 7, 9].map((c) => (
            <circle key={`${r}-${c}`} cx={c} cy={(r * 16) / 13 / 1.05} r="0.45" />
          ))
        )}
      </g>
    </svg>
  );
}

/** Cambodia — used for Khmer (blue/red/blue bands + Angkor Wat). */
export function KHFlag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="ខ្មែរ"
    >
      <rect width="24" height="16" fill="#032ea1" />
      <rect y="4" width="24" height="8" fill="#e00025" />
      {/* Simplified Angkor Wat: three towers on a base. */}
      <g fill="#fff">
        <rect x="8.5" y="10" width="7" height="1.3" />
        <rect x="11.3" y="5.2" width="1.4" height="5" />
        <rect x="9.2" y="6.6" width="1.1" height="3.4" />
        <rect x="13.7" y="6.6" width="1.1" height="3.4" />
        <path d="M12 4.3l1 1.1h-2z" />
        <path d="M9.75 5.9l0.7 0.8h-1.4z" />
        <path d="M14.25 5.9l0.7 0.8h-1.4z" />
      </g>
    </svg>
  );
}

export function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  return locale === "km" ? <KHFlag className={className} /> : <USFlag className={className} />;
}
