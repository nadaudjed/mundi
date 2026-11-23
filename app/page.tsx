import { Feed } from "@/components/Feed";
import { feedPublications } from "@/lib/verified";

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">
        {feedPublications.length > 0 ? "MUNDI — fil : publications vérifiées puis démonstrations" : "MUNDI — fil de découverte (démonstration)"}
      </h1>
      <Feed verified={feedPublications} />
    </>
  );
}
