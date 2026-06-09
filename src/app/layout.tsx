import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { accentHtmlProps, ACCENT_COOKIE, ACCENT_CUSTOM_COOKIE } from "@/lib/accent";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Khmer glyphs aren't in Inter — this provides per-glyph fallback so Khmer UI
// text renders correctly while Latin text stays on Inter.
const khmer = Noto_Sans_Khmer({
  subsets: ["khmer"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-khmer",
});

export const metadata: Metadata = {
  title: "Clinic SaaS — Practice Management",
  description: "Multi-clinic management system for doctors and small clinics.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Render the saved accent ("UI tone") directly on <html> from a cookie so the
  // very first paint already has it — no color flash on load/refresh. The head
  // script below stays as a localStorage fallback (e.g. before the cookie is
  // set on a returning user's first post-update load).
  const cookieStore = await cookies();
  const dec = (v?: string) => (v ? decodeURIComponent(v) : undefined);
  const accentProps = accentHtmlProps(
    dec(cookieStore.get(ACCENT_COOKIE)?.value),
    dec(cookieStore.get(ACCENT_CUSTOM_COOKIE)?.value)
  );

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-accent={accentProps["data-accent"]}
      style={accentProps.style as CSSProperties | undefined}
    >
      <head>
        {/* Apply the saved UI tone before paint to avoid a color flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var e=document.documentElement,a=localStorage.getItem('ui-accent');if(a==='custom'){var h=localStorage.getItem('ui-accent-custom');if(h){var S=[['50',0.97,0.18],['100',0.93,0.35],['300',0.81,0.7],['400',0.71,0.9],['500',0.62,1],['600',0.55,1.05],['700',0.49,1]];for(var i=0;i<S.length;i++){e.style.setProperty('--brand-'+S[i][0],'oklch(from '+h+' '+S[i][1]+' calc(c * '+S[i][2]+') h)')}e.setAttribute('data-accent','custom')}}else if(a&&a!=='blue'){e.setAttribute('data-accent',a)}}catch(_){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${khmer.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
