import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: { default: "MUNDI — Comprendre le monde", template: "%s · MUNDI" },
  description: "Comprendre le monde n'a jamais été aussi simple. Prototype de démonstration : contenus illustratifs.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#101D30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-night focus:px-4 focus:py-2 focus:text-ivory"
        >
          Aller au contenu
        </a>
        <ToastProvider>
          <SiteHeader />
          <main id="contenu">{children}</main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
