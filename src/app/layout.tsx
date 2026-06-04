import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Clinic SaaS — Practice Management",
  description: "Multi-clinic management system for doctors and small clinics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved UI tone before paint to avoid a color flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var e=document.documentElement,a=localStorage.getItem('ui-accent');if(a==='custom'){var h=localStorage.getItem('ui-accent-custom');if(h){var S=[['50',0.97,0.18],['100',0.93,0.35],['300',0.81,0.7],['400',0.71,0.9],['500',0.62,1],['600',0.55,1.05],['700',0.49,1]];for(var i=0;i<S.length;i++){e.style.setProperty('--brand-'+S[i][0],'oklch(from '+h+' '+S[i][1]+' calc(c * '+S[i][2]+') h)')}e.setAttribute('data-accent','custom')}}else if(a&&a!=='blue'){e.setAttribute('data-accent',a)}}catch(_){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
