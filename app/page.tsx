import { HomeEdition } from "@/components/home/HomeEdition";
import { feedPublications, todayConfig } from "@/lib/verified";

/** Accueil : l'édition du jour puis les dernières publications, en défilement naturel. */
export default function HomePage() {
  return <HomeEdition publications={feedPublications} today={todayConfig} />;
}
