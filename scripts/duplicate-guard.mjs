/**
 * MUNDI (#125) — contrôle anti-doublon avant publication.
 *
 * Le 26/11/2026, deux articles sur la même amende (entente dans les parfums, communiqué IP/26/2574)
 * ont été publiés le même jour : les titres différaient et une seule source sur deux était commune,
 * si bien que l'ancien contrôle (même titre, même slug ou exactement les mêmes sources) ne voyait rien.
 *
 * Deux signaux, combinés :
 * 1. une source primaire commune : identifiant de décision ou de communiqué normalisé (IP/26/2574,
 *    ip_26_2574, AT.40826, CELEX, ECLI, DOI…) ou adresse de source identique une fois normalisée ;
 * 2. la similarité du fait : mots du titre et du résumé en commun, chiffres saillants en commun
 *    (471,9 millions ; 252 363 000…), date de l'événement proche.
 *
 * Verdict :
 * - « doublon » (manifeste) : source primaire commune ET même fait → mis en attente, jamais publié ;
 * - « revue » : source primaire commune seule (les angles peuvent être distincts : un concept et une
 *   actualité peuvent citer le même communiqué) → pas de publication automatique, relecture humaine ;
 * - null : rien de commun.
 * Fonctions pures, sans réseau.
 */

const STOP = new Set(
  ("les des une un le la l d de du et en au aux a à pour par sur dans avec sans que qui quoi ce ces cette son sa ses leur leurs " +
    "est sont été être plus moins entre selon après avant comme mais ou où ne pas se s y il elle ils elles on nous vous " +
    "the of and to in for on by with from at is are was were").split(" "),
);

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Adresse de source comparable : https, sans www, sans ancre, sans paramètres de suivi, sans barre finale. */
export function normalizeSourceUrl(raw) {
  try {
    const u = new URL(String(raw).trim().replace(/^http:/i, "https:"));
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|xtor)/i.test(k)) u.searchParams.delete(k);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    // Le portail de presse de la Commission sert le même communiqué en /detail/en/, /detail/fr/…
    const path = decodeURIComponent(u.pathname).replace(/\/detail\/[a-z]{2}\//i, "/detail/").replace(/\/+$/, "").toLowerCase();
    return host + path + (u.search ? u.search.toLowerCase() : "");
  } catch {
    return fold(raw).trim();
  }
}

/**
 * Identifiants de décisions ou de sources primaires, normalisés (« IP/26/2574 » et « ip_26_2574 » donnent
 * « ec:ip/26/2574 »). Cherchés dans les libellés et adresses des sources, le titre et le résumé.
 */
export function primaryIds(p) {
  const hay = [p?.title, p?.summary, ...(p?.sources ?? []).flatMap((s) => [s?.label, s?.url])].map((x) => String(x ?? "")).join(" \n ");
  const ids = new Set();
  // Communiqués, déclarations et mémos de la Commission européenne.
  // (Les « MEX » et « Daily News » regroupent plusieurs sujets : ce ne sont pas des sources primaires.)
  for (const m of hay.matchAll(/\b(ip|memo|speech|statement|qanda)[/_ ](\d{2})[/_ ](\d{1,5})\b/gi))
    ids.add(`ec:${m[1].toLowerCase()}/${m[2]}/${Number(m[3])}`);
  // Affaires de concurrence (AT.40826, M.11234, SA.12345), CELEX, ECLI, DOI.
  for (const m of hay.matchAll(/\b(AT|M|SA)\.(\d{4,6})\b/g)) ids.add(`case:${m[1].toLowerCase()}.${m[2]}`);
  for (const m of hay.matchAll(/\bCELEX[:%3A]*([0-9]{5}[A-Z]{1,2}[0-9]{4})\b/gi)) ids.add(`celex:${m[1].toUpperCase()}`);
  for (const m of hay.matchAll(/\bECLI:[A-Z]{2}:[A-Z]+:\d{4}:[0-9A-Z.]+/gi)) ids.add(m[0].toUpperCase());
  for (const m of hay.matchAll(/\b10\.\d{4,9}\/[^\s"'<>]+/g)) ids.add(`doi:${m[0].toLowerCase().replace(/[.,;)]+$/, "")}`);
  return ids;
}

/** Chiffres saillants (au moins trois chiffres, ou un décimal) : « 471,9 », « 252 363 000 ». Les années seules sont ignorées. */
export function salientNumbers(p) {
  const hay = [p?.title, p?.summary, ...(p?.keyPoints ?? [])].join(" ");
  const out = new Set();
  for (const m of String(hay).matchAll(/\d{1,3}(?:[  .]\d{3})+(?:,\d+)?|\d+,\d+|\d{3,}/g)) {
    const n = m[0].replace(/[  .]/g, "").replace(",", ".");
    if (/^(19|20)\d{2}$/.test(n)) continue;
    out.add(n);
  }
  return out;
}

const words = (p) =>
  new Set(
    fold([p?.title, p?.summary].join(" "))
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)),
  );

/** Pages qui regroupent plusieurs sujets (revue de presse quotidienne de la Commission) : jamais une source primaire. */
const DIGEST = /presscorner\/detail\/(mex|daily)_/;

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
};

const daysApart = (a, b) => {
  const x = Date.parse(a), y = Date.parse(b);
  return Number.isNaN(x) || Number.isNaN(y) ? Infinity : Math.abs(x - y) / 86_400_000;
};

/** Comparaison d'un brouillon (ou d'une publication) avec une publication existante. */
export function compare(candidate, existing) {
  const ids = primaryIds(candidate), other = primaryIds(existing);
  const sharedIds = [...ids].filter((x) => other.has(x));
  const urls = new Set((candidate?.sources ?? []).map((s) => normalizeSourceUrl(s?.url)).filter((u) => !DIGEST.test(u)));
  const sharedUrls = (existing?.sources ?? []).map((s) => normalizeSourceUrl(s?.url)).filter((u) => urls.has(u));
  const nums = salientNumbers(candidate), otherNums = salientNumbers(existing);
  const sharedNumbers = [...nums].filter((x) => otherNums.has(x));
  const similarity = Math.round(jaccard(words(candidate), words(existing)) * 100) / 100;
  const sameDay = daysApart(candidate?.eventDate ?? candidate?.publishedAt, existing?.eventDate ?? existing?.publishedAt) <= 3;
  return { sharedIds, sharedUrls: [...new Set(sharedUrls)], sharedNumbers, similarity, sameDay };
}

/**
 * Verdict pour un brouillon face au catalogue (publications retirées comprises : un article retiré pour
 * doublon ne doit pas revenir). Renvoie le cas le plus grave.
 */
export function duplicateCheck(candidate, catalogue) {
  let review = null;
  for (const p of catalogue ?? []) {
    if (!p || p.slug === candidate?.slug && p === candidate) continue;
    const c = compare(candidate, p);
    const primary = c.sharedIds.length > 0 || c.sharedUrls.length > 0;
    const sameFact = c.similarity >= 0.6 || (c.sameDay && (c.similarity >= 0.3 || c.sharedNumbers.length >= 2));
    if (primary && sameFact) {
      return { level: "doublon", slug: p.slug, ...c,
        reason: `doublon manifeste de « ${p.slug} » : même source primaire (${[...c.sharedIds, ...c.sharedUrls].slice(0, 2).join(", ")}) et même fait` };
    }
    if (c.similarity >= 0.75 && c.sameDay) {
      return { level: "doublon", slug: p.slug, ...c, reason: `doublon manifeste de « ${p.slug} » : même fait, mêmes termes` };
    }
    if (primary && !review) {
      review = { level: "revue", slug: p.slug, ...c,
        reason: `source primaire commune avec « ${p.slug} » (${[...c.sharedIds, ...c.sharedUrls].slice(0, 2).join(", ")}) : angle à vérifier par la rédaction` };
    }
  }
  return review;
}

/** Paires du catalogue publié qui seraient aujourd'hui bloquées (audit et tests de non-régression). */
export function catalogueDuplicates(list, { level = "doublon" } = {}) {
  const live = (list ?? []).filter((p) => p?.status === "published");
  const pairs = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const v = duplicateCheck(live[j], [live[i]]);
      if (v && (level === "revue" || v.level === "doublon")) pairs.push({ a: live[i].slug, b: live[j].slug, level: v.level, similarity: v.similarity });
    }
  }
  return pairs;
}
