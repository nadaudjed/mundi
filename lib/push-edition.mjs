/**
 * Notifications d'édition : logique pure (testée dans tests/push-edition.test.mjs), partagée par le Worker
 * Cloudflare (worker/) et, pendant la transition, les anciennes fonctions Netlify.
 * Une notification part quand la version en ligne contient de
 * nouvelles publications, au plus une fois par heure. Aucune donnée personnelle.
 */
export const MIN_GAP_MS = 60 * 60 * 1000;

/** Moment de la journée à Paris : « matin », « après-midi » ou « soir ». */
export function editionName(date) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  return hour < 12 ? "du matin" : hour < 18 ? "de l'après-midi" : "du soir";
}

/**
 * @param {{ slugs: string[], lastNotifiedAt?: string } | null} state état enregistré
 * @param {{ slug: string, title: string }[]} items publications en ligne, plus récentes d'abord
 * @param {Date} now
 * @returns {{ state: { slugs: string[], lastNotifiedAt?: string }, message: { title: string, body: string, url: string } | null }}
 */
export function planEdition(state, items, now) {
  const slugs = items.map((i) => i.slug);
  // Premier passage : on mémorise ce qui existe déjà, sans rien envoyer.
  if (!state) return { state: { slugs }, message: null };
  const known = new Set(state.slugs);
  const fresh = items.filter((i) => !known.has(i.slug));
  const last = state.lastNotifiedAt ? Date.parse(state.lastNotifiedAt) : 0;
  if (!fresh.length || now.getTime() - last < MIN_GAP_MS) return { state: { ...state, slugs }, message: null };
  const body = fresh.length === 1
    ? fresh[0].title
    : `${fresh.length} nouveaux articles, dont : ${fresh[0].title}`;
  return {
    state: { slugs, lastNotifiedAt: now.toISOString() },
    message: { title: `MUNDI · L'édition ${editionName(now)} est en ligne`, body: body.length > 180 ? body.slice(0, 177) + "…" : body, url: "/" },
  };
}

/** Abonnement Web Push valide (adresse HTTPS et clés présentes). */
export function validSubscription(s) {
  if (!s || typeof s !== "object" || typeof s.endpoint !== "string" || s.endpoint.length > 1000) return false;
  try { if (new URL(s.endpoint).protocol !== "https:") return false; } catch { return false; }
  return Boolean(s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string" && s.keys.p256dh.length < 200 && s.keys.auth.length < 100);
}
