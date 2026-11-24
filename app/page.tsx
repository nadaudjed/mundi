import { Feed } from "@/components/Feed";
import { feedPublications } from "@/lib/verified";

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">
        MUNDI — fil des publications sourcées
      </h1>
      {/* Le site de test (publications inventées) garde un ordre fixe pour les vérifications. */}
      <Feed verified={feedPublications} mix={!process.env.MUNDI_TEST_PUBLICATIONS} />
    </>
  );
}
