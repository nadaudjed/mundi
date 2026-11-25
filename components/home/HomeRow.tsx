import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { HomeItem } from "@/lib/home";
import { publicationPath } from "@/lib/publication-links";
import { getTopic } from "@/lib/topics";

/** Ligne compacte de « Dernières publications » : format, rubrique, titre, date et sources. */
export function HomeRow({ item, testId = "home-latest-item" }: { item: HomeItem; testId?: string }) {
  const topic = getTopic(item.topic);
  const date = item.kind === "actualite" && item.eventDate ? item.eventDate : item.publishedAt;
  return (
    <li data-testid={testId} data-publication={item.slug} className="border-b border-rule py-4 last:border-b-0">
      <p className="text-[0.75rem] font-semibold text-accent">
        {item.format}
        {topic && <span className="font-normal text-muted"> · {topic.name}</span>}
      </p>
      <h3 className="mt-1 text-[1.05rem] leading-snug font-semibold text-ink text-balance">
        <Link href={publicationPath(item.slug)} className="title-link">{item.title}</Link>
      </h3>
      <p className="mt-1.5 text-meta text-muted">
        <time dateTime={date}>{formatDate(date)}</time> · {item.verification} · {item.sources} source{item.sources > 1 ? "s" : ""}
      </p>
    </li>
  );
}
