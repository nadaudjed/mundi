import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
// Pilote « Aujourd'hui » : titres en Instrument Serif, interface en Inter (licences OFL, auto-hébergées).
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource-variable/inter/wght.css";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PwaSetup } from "@/components/PwaSetup";
import { SearchShortcut } from "@/components/SearchShortcut";
import { SiteHeader } from "@/components/SiteHeader";
import { ToastProvider } from "@/components/Toast";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayer";
import { themeScript } from "@/lib/theme";
import { introScript } from "@/lib/intro";
import { headCleanScript } from "@/lib/head-clean";
import { IntroSplash } from "@/components/IntroSplash";
import { SITE_URL, SHARE_IMAGE, shareDefaults } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "MUNDI — Comprendre le monde", template: "%s · MUNDI" },
  description: "MUNDI : actualités et concepts sourcés pour comprendre le monde.",
  robots: { index: false, follow: false },
  applicationName: "MUNDI",
  appleWebApp: { capable: true, title: "MUNDI", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  openGraph: { ...shareDefaults, type: "website", title: "MUNDI — Comprendre le monde", description: "Comprendre le monde n'a jamais été aussi simple." },
  twitter: { card: "summary_large_image", images: [SHARE_IMAGE.url] },
};

export const viewport: Viewport = {
  themeColor: "#101D30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headCleanScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body className="min-h-dvh">
        <IntroSplash />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink"
        >
          Aller au contenu
        </a>
        <PwaSetup />
        <SearchShortcut />
        <ToastProvider>
          <AudioPlayerProvider>
            <SiteHeader />
            <main id="contenu">{children}</main>
            <BottomNav />
          </AudioPlayerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
