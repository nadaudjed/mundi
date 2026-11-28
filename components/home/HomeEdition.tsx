import Link from "next/link";
import { dossierIndex, dossierPath, dossiers } from "@/lib/dossiers";
import { HOME_BATCH, formatOf, latestAfter, stakeOf, toHomeItem } from "@/lib/home";
import { publicationPath } from "@/lib/publication-links";
import { resolveToday, type ResolvedToday, type TodayConfig } from "@/lib/today";
import { editionNow } from "@/lib/edition-clock";
import { formatDate } from "@/lib/format";
import { getTopic } from "@/lib/topics";
import { frenchSpacing } from "@/lib/typo";
import type { FeedPublication } from "@/lib/verified";
import { EditorialPhotoCredit } from "../EditorialPhotoLayer";
import { MundiCover } from "../MundiCover";
import { coverOf } from "@/lib/covers";
import { Icon } from "../Icon";
import { LatestPublications } from "./LatestPublications";
import { EditionHeading } from "./EditionHeading";

const editionDate = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
};

/**
 * Accueil (ticket #113) : une édition lisible en défilement naturel.
 * 1 sujet principal, 2 secondaires, puis « Dernières publications » par lots.
 * Pour chaque sujet : format, titre, enjeu en une phrase et une action principale.
 * Le fil plein écran reste disponible à /fil/, en accès explicite.
 */
export function HomeEdition({ publications, today, now = editionNow() }: { publications: FeedPublication[]; today: TodayConfig | null; now?: Date }) {
  // Édition datée (#125) : la sélection de la rédaction le jour même (heure de Paris) ; sinon un repli
  // explicite sur les publications les plus récentes, une actualité en tête.
  const edition = resolveToday(publications, today, now);
  const picks = edition.picks.map((p) => p.publication);
  const [main, ...secondary] = picks;
  const latest = latestAfter(publications, picks.map((p) => p.slug)).map(toHomeItem);
  const date = editionDate(edition.edition);

  return (
    <div data-home className="magazine mx-auto max-w-5xl px-4 pt-6 pb-[calc(var(--nav-h)+3rem)] min-[360px]:px-5 md:px-8 md:pt-10 md:pb-20">
      <header className="border-b border-rule pb-4">
        {/* Libellé daté ; il change dans le navigateur si minuit passe à Paris (site statique, #125). */}
        <EditionHeading state={edition.state} title={today?.title} date={date} builtFor={edition.today} selectionDate={edition.selectionDate} />
        {/* Titre de la page pour les lecteurs d'écran (et repère du contrôle de production). */}
        <h1 className="sr-only">MUNDI — fil des publications sourcées</h1>
        <p className="mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
          {edition.state === "a-jour" ? (today?.intro ?? "Une sélection courte, puis toutes les dernières publications.") : "Une sélection courte, puis toutes les dernières publications."}
        </p>
        <EditionNotice edition={edition} />
      </header>

      {main ? (
        <section aria-label="Sujets du jour" data-testid="home-edition" className="mt-5 grid gap-8 md:grid-cols-[3fr_2fr] md:gap-10">
          <Topic publication={main} rank={1} size={picks.length} lead />
          {secondary.length > 0 && (
            <div className="grid content-start gap-8 border-t border-rule pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
              {secondary.map((p, i) => (
                <Topic key={p.slug} publication={p} rank={i + 2} size={picks.length} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="mt-8 text-base text-muted">Les premières publications arrivent bientôt.</p>
      )}

      <PilotDossier />

      {main && (
        <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-rule py-4 text-sm text-muted">
          <span>Envie de faire défiler en plein écran, une publication à la fois ?</span>
          <Link href="/fil/" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink underline underline-offset-4 hover:text-accent" data-testid="home-immersive">
            Ouvrir le fil immersif <Icon name="chevron-right" className="size-4" />
          </Link>
        </p>
      )}

      {latest.length > 0 && (
        <section aria-labelledby="home-latest-title" className="mt-10">
          <h2 id="home-latest-title" className="font-serif text-[1.75rem] leading-tight text-ink md:text-[2.1rem]">Dernières publications</h2>
          <LatestPublications initial={latest.slice(0, HOME_BATCH)} total={latest.length} exclude={picks.map((p) => p.slug)} />
        </section>
      )}
    </div>
  );
}

/** Un sujet de l'édition. `lead` : le sujet principal, en grand, avec la première image prioritaire. */
function Topic({ publication: p, rank, size, lead = false }: { publication: FeedPublication; rank: number; size: number; lead?: boolean }) {
  const topic = getTopic(p.topic);
  const href = publicationPath(p.slug);
  const title = frenchSpacing(p.decryptage?.shortTitle ?? p.title);
  const action = p.decryptage ? { href: `${href}#comprendre`, label: "Comprendre" } : { href, label: "Lire" };
  const H = lead ? "h2" : "h3";
  return (
    <article data-testid="home-topic" data-publication={p.slug} data-rank={rank} aria-label={`Sujet ${rank} sur ${size} : ${title}`} className="min-w-0">
      <Link href={href} tabIndex={-1} aria-hidden="true" className={`press relative block overflow-hidden bg-ivory-2 ${lead ? "aspect-[16/9] md:aspect-[3/2]" : "aspect-[16/9]"}`}>
        {p.photo ? (
          // Photo d'illustration de Commons : la première est chargée en priorité, les suivantes à l'approche.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo.src} alt="" decoding="async" loading={lead ? "eager" : "lazy"} fetchPriority={lead ? "high" : "low"} className="photo absolute inset-0 h-full w-full object-cover" data-testid="home-photo" />
        ) : (
          <MundiCover publication={p} tone="paper" size={lead ? "lg" : "compact"} className="absolute inset-0" />
        )}
      </Link>
      {p.photo ? (
        <p className="mt-1.5 text-[0.7rem] leading-snug text-muted">
          <EditorialPhotoCredit photo={p.photo} />
        </p>
      ) : (
        <CoverSource publication={p} />
      )}
      <p className="mt-3 text-[0.75rem] font-semibold text-accent" data-testid="home-format">
        {formatOf(p)}
        {topic && <span className="font-normal text-muted"> · {topic.name}</span>}
      </p>
      {/* Date du fait (actualité) et date de publication, distinctes de la date de l'édition (#125). */}
      <p className="mt-0.5 text-[0.72rem] text-muted" data-testid="home-dates">
        {p.kind === "actualite" && p.eventDate && p.eventDate !== p.publishedAt && <>Fait du {formatDate(p.eventDate)} · </>}
        Publié le {formatDate(p.publishedAt)}
      </p>
      <H className={`font-serif mt-1 text-ink text-balance ${lead ? "text-[2rem] leading-[1.05] md:text-[2.5rem]" : "text-[1.5rem] leading-[1.1]"}`}>
        <Link href={href} className="title-link">{title}</Link>
      </H>
      <p className={`mt-2 leading-relaxed text-muted ${lead ? "text-[1rem]" : "text-[0.92rem]"}`} data-testid="home-stake">{stakeOf(p)}</p>
      <Link href={action.href} aria-label={`${action.label} : ${title}`} className={`btn mt-4 min-h-11 ${lead ? "btn-primary" : "btn-secondary"}`} data-testid="home-action">
        {action.label}
      </Link>
    </article>
  );
}

/**
 * Pendant le pilote (ticket #120) : un lien visible vers le dossier suivi,
 * pour qu'un lecteur le trouve sans passer par un article ou par Explorer.
 */
function PilotDossier() {
  const pilot = dossierIndex().find((d) => dossiers.find((x) => x.id === d.id)?.status === "pilote");
  if (!pilot) return null;
  return (
    <section aria-labelledby="home-dossier-title" data-testid="home-dossier" className="relative mt-10 border-l-[3px] border-accent bg-surface px-4 py-4 md:px-6 md:py-5">
      <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-accent uppercase">Nouveau · Dossier à suivre</p>
      <h2 id="home-dossier-title" className="mt-1.5 font-serif text-[1.5rem] leading-[1.1] text-ink text-balance md:text-[1.75rem]">
        <Link href={dossierPath(pilot.id)} className="title-link after:absolute after:inset-0">{pilot.title}</Link>
      </h2>
      <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-muted">
        L&apos;actualité, le récit et les chiffres réunis sur une page. Suivez le dossier pour retrouver ses mises à jour dans Bibliothèque.
      </p>
      <p className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink" aria-hidden="true">
        Ouvrir le dossier <Icon name="chevron-right" className="size-4" />
      </p>
    </section>
  );
}

/**
 * Repli visible (#125) : quand la sélection de la rédaction n'est pas celle du jour, l'accueil le dit
 * au lieu de présenter une ancienne sélection comme l'édition d'aujourd'hui.
 */
function EditionNotice({ edition }: { edition: ResolvedToday<FeedPublication> }) {
  if (edition.state === "a-jour" || !edition.selectionDate) return null;
  const text =
    edition.state === "perimee"
      ? `La sélection de la rédaction date du ${formatDate(edition.selectionDate)}. En attendant la prochaine, voici les publications les plus récentes, une actualité en tête.`
      : `Dernière édition de la rédaction, datée du ${formatDate(edition.selectionDate)} : rien de nouveau n'a été publié depuis.`;
  return (
    <p className="mt-3 max-w-2xl border-l-2 border-accent pl-3 text-[0.85rem] leading-relaxed text-ink" data-testid="home-edition-notice" data-state={edition.state}>
      {text}
    </p>
  );
}

/** Couverture « chiffre clé » : la source de la valeur reste accessible sous l'image. */
function CoverSource({ publication: p }: { publication: FeedPublication }) {
  const figure = coverOf(p).figure;
  if (!figure) return null;
  return (
    <p className="mt-1.5 text-[0.7rem] leading-snug text-muted" data-testid="cover-source">
      Chiffre clé :{" "}
      <a href={figure.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{figure.source.label}</a>
    </p>
  );
}
