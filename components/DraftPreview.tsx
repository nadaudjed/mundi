import { formatDate } from "@/lib/format";
import { getTopic, inkOn } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import { EditorialBackdrop } from "./EditorialBackdrop";

export type PreviewData = {
  title: string;
  summary: string;
  topic: TopicSlug;
  keyPoints: string[];
  sources: { label: string; url: string }[];
  externalPublishedAt?: string | null;
};

const missing = (label: string) => <span className="rounded bg-amber/20 px-1 text-[#ffd98f] italic">[{label} à rédiger]</span>;

/**
 * Aperçu d'un brouillon dans l'apparence du fil MUNDI.
 * Uniquement dans l'atelier : jamais dans le fil public, jamais de badge « Vérifié ».
 */
export function DraftPreview({ data }: { data: PreviewData }) {
  const topic = getTopic(data.topic)!;
  const sources = data.sources.filter((s) => s.label.trim());
  return (
    <div
      role="region"
      aria-label="Prévisualisation du brouillon"
      data-testid="draft-preview"
      className="relative mx-auto flex h-[38rem] w-full max-w-[24rem] flex-col overflow-hidden rounded-[2rem] bg-night text-ivory shadow-2xl ring-1 ring-night/20"
    >
      <EditorialBackdrop visual="sobre" color={topic.color} pattern={topic.pattern} seed={data.title || "brouillon"} />
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <p
        className="absolute inset-x-4 top-4 z-10 rounded-2xl border-2 border-dashed border-amber bg-night/85 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#ffd98f]"
        data-testid="draft-badge"
      >
        Brouillon — non publié
      </p>
      <div className="relative mt-auto px-5 pb-7">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold">
          <span className="rounded-full px-2.5 py-1" style={{ background: topic.color, color: inkOn(topic.color) }}>
            {topic.name}
          </span>
          <span className="rounded-full border border-amber/60 px-2.5 py-1 text-[#ffd98f]">Non vérifié</span>
        </div>
        <h2 className="font-display text-[1.45rem] leading-[1.15] font-semibold text-balance">{data.title.trim() || missing("Titre")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ivory/80">{data.summary.trim() || missing("Résumé")}</p>
        <ol className="mt-3 space-y-1.5">
          {data.keyPoints.map((p, i) => (
            <li key={i} className="flex gap-2 text-[0.8rem] leading-snug text-ivory/90">
              <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-mint/20 text-[0.65rem] font-bold text-mint-soft">{i + 1}</span>
              <span>{p.trim() || missing(`Idée ${i + 1}`)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 text-xs text-ivory/75">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-mint-soft">Sources à vérifier</p>
          <ul className="mt-1 space-y-0.5">
            {sources.map((s, i) => (
              <li key={i}>{s.label}</li>
            ))}
            {sources.length < 2 && <li>{missing("Deuxième source")}</li>}
          </ul>
          {data.externalPublishedAt && <p className="mt-2">Date de la source externe : {formatDate(data.externalPublishedAt.slice(0, 10))}</p>}
        </div>
      </div>
    </div>
  );
}
