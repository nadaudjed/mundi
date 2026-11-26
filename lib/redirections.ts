import redirections from "@/content/redirections.json";

/**
 * Adresses d'articles fusionnés (#125) : l'ancien identifiant mène à la publication de référence.
 * La même liste sert à Netlify (netlify.toml, redirection 301 des pages) et aux enregistrements
 * du navigateur (un favori sur l'ancien article pointe vers la référence). Un test vérifie que
 * netlify.toml et cette liste concordent.
 */
export type Redirection = { from: string; to: string; date: string; reason: string };

export const articleRedirections = redirections as Redirection[];

const bySlug = new Map(articleRedirections.map((r) => [r.from, r.to]));

/** Identifiant à jour d'un article (suit au plus quelques redirections, sans boucle). */
export function currentSlug(slug: string): string {
  let s = slug;
  for (let i = 0; i < 5 && bySlug.has(s); i++) s = bySlug.get(s)!;
  return s;
}
