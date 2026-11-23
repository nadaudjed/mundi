/** Clé d'enregistrement d'une publication vérifiée (distincte des démonstrations). */
export const publicationKey = (slug: string) => `actualite:${slug}`;
/** Adresse de la page d'une publication vérifiée. */
export const publicationPath = (slug: string) => `/actualites/${slug}/`;
