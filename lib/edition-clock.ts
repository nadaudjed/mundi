/**
 * Horloge de l'édition « Aujourd'hui » (#125) : l'heure du build, sauf pour les tests de bout en bout,
 * qui fixent la date (MUNDI_TEST_NOW) pour que la sélection du pilote reste vérifiable.
 * Refusé sur Netlify : la préproduction et la production utilisent toujours l'heure réelle.
 */
export function editionNow(): Date {
  const fixed = process.env.MUNDI_TEST_NOW;
  if (!fixed) return new Date();
  if (process.env.NETLIFY || process.env.CONTEXT) throw new Error("MUNDI_TEST_NOW est réservé aux tests locaux.");
  const d = new Date(fixed);
  if (Number.isNaN(d.getTime())) throw new Error("MUNDI_TEST_NOW invalide : " + fixed);
  return d;
}
