import type { Metadata } from "next";
import { Feed } from "@/components/Feed";
import { feedPublications, todayConfig } from "@/lib/verified";
import { selectToday } from "@/lib/today";

export const metadata: Metadata = { title: "Fil immersif" };

/** Fil immersif : une publication par écran (ancien accueil), en accès explicite depuis l'accueil. */
export default function FeedPage() {
  const today = todayConfig
    ? { edition: todayConfig.edition, picks: selectToday(feedPublications, todayConfig).map((p) => ({ slug: p.publication.slug, fallback: p.reason === "secours" })) }
    : undefined;
  return (
    <>
      <h1 className="sr-only">MUNDI — fil immersif des publications sourcées</h1>
      {/* Le site de test (publications inventées) garde un ordre fixe pour les vérifications. */}
      <Feed verified={feedPublications} mix={!process.env.MUNDI_TEST_PUBLICATIONS} today={today} />
    </>
  );
}
