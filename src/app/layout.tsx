import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/settings";
import { all } from "@/lib/db";
import type { Lang } from "@/lib/i18n";
import { DEMO } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Nuqa نقاء — Laundry delivered", template: "%s · Nuqa" },
  description: "On-demand laundry, ironing & dry cleaning with pickup and delivery to your door.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Nuqa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1A62EC",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = ((await cookies()).get("nuqa_lang")?.value === "en" ? "en" : "ar") as Lang;
  const settings = await getSettings();
  const services = await all("SELECT * FROM services WHERE active=1 ORDER BY sort");
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers lang={lang} settings={{ ...settings, demo: DEMO }} services={services as any}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
