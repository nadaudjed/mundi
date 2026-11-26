import Link from "next/link";
import { dossierPath, type DossierIndexItem } from "@/lib/dossiers";
import { formatDate } from "@/lib/format";
import { getTopic } from "@/lib/topics";

/** Un dossier dans une liste (Explorer) : la carte entière mène à la page du dossier. */
export function DossierTile({ dossier: d, headingLevel = 3 }: { dossier: DossierIndexItem; headingLevel?: 2 | 3 }) {
  const topic = getTopic(d.topic);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article data-testid="dossier-tile" data-dossier={d.id} className="relative min-w-0 border-l-[3px] border-accent bg-surface px-4 py-4 md:px-5">
      <p className="text-meta font-semibold text-accent">
        Dossier{topic && <span className="font-normal text-muted"> · {topic.name}</span>}
      </p>
      <H className="mt-1.5 font-display text-xl font-semibold leading-snug text-ink text-balance">
        {/* Le lien couvre toute la carte (after:absolute) : une seule cible, simple au doigt. */}
        <Link href={dossierPath(d.id)} className="title-link after:absolute after:inset-0">{d.title}</Link>
      </H>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{d.intro}</p>
      <p className="mt-3 text-meta text-muted">
        {d.publicationCount} publications réunies · chronologie, chiffres sourcés · mis à jour le{" "}
        <time dateTime={d.updatedAt}>{formatDate(d.updatedAt)}</time>
      </p>
      <p className="mt-2 text-sm font-semibold text-ink" aria-hidden="true">Ouvrir le dossier et le suivre →</p>
    </article>
  );
}
