import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PreviewHostFlag } from "@/components/PreviewHostFlag";
import { PwaSetup } from "@/components/PwaSetup";
import { SiteHeader } from "@/components/SiteHeader";
import { ToastProvider } from "@/components/Toast";
import { netlifyHostScript } from "@/lib/preview-host";
import { SITE_URL, SHARE_IMAGE, shareDefaults } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "MUNDI — Comprendre le monde", template: "%s · MUNDI" },
  description: "Comprendre le monde n'a jamais été aussi simple. Prototype de démonstration : contenus illustratifs.",
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
        <script dangerouslySetInnerHTML={{ __html: netlifyHostScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-night focus:px-4 focus:py-2 focus:text-ivory"
        >
          Aller au contenu
        </a>
        <PwaSetup />
        <PreviewHostFlag />
        <ToastProvider>
          <SiteHeader />
          <main id="contenu">{children}</main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
