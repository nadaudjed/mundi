import type { Metadata } from "next";
import { Feed } from "@/components/Feed";
import { feedPublications, todayConfig } from "@/lib/verified";
import { resolveToday } from "@/lib/today";
import { editionNow } from "@/lib/edition-clock";

export const metadata: Metadata = { title: "Fil immersif" };

/** Fil immersif : une publication par écran (ancien accueil), en accès explicite depuis l'accueil. */
export default function FeedPage() {
  // Édition datée (#125) : sélection de la rédaction le jour même (heure de Paris), sinon repli explicite.
  const resolved = todayConfig ? resolveToday(feedPublications, todayConfig, editionNow()) : null;
  const today = resolved
    ? { edition: resolved.edition, state: resolved.state, picks: resolved.picks.map((p) => ({ slug: p.publication.slug, fallback: p.reason !== "selection" })) }
    : undefined;
  return (
    <>
      <h1 className="sr-only">MUNDI — fil immersif des publications sourcées</h1>
      {/* Le site de test (publications inventées) garde un ordre fixe pour les vérifications. */}
      <Feed verified={feedPublications} mix={!process.env.MUNDI_TEST_PUBLICATIONS} today={today} />
    </>
  );
}
