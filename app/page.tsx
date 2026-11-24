import { Feed } from "@/components/Feed";
import { feedPublications } from "@/lib/verified";

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">
        MUNDI — fil des publications sourcées
      </h1>
      <Feed verified={feedPublications} />
    </>
  );
}
