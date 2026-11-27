import { HomeEdition } from "@/components/home/HomeEdition";
import { feedPublications, todayConfig } from "@/lib/verified";
import type { Metadata } from "next";
import { shareDefaults } from "@/lib/site";

/** Adresse canonique et carte de partage de l'accueil, sur le domaine officiel (#129). */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...shareDefaults, type: "website", url: "/", title: "MUNDI — Comprendre le monde", description: "Comprendre le monde n'a jamais été aussi simple." },
};

/** Accueil : l'édition du jour puis les dernières publications, en défilement naturel. */
export default function HomePage() {
  return <HomeEdition publications={feedPublications} today={todayConfig} />;
}
