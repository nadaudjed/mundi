/**
 * Transfert des données locales d'une adresse à l'autre (ticket #129).
 *
 * Le navigateur range les données de MUNDI par adresse : ce qui a été enregistré sur l'ancienne
 * adresse Netlify n'est pas visible sur l'adresse officielle Cloudflare. La page /transfert/ de
 * l'ancienne adresse prépare un « paquet » (lien ou fichier), la page /transfert/ de l'adresse
 * officielle le vérifie puis le fusionne avec ce qui s'y trouve déjà. Rien ne passe par un serveur :
 * le lien porte les données après le « # », partie de l'adresse que le navigateur n'envoie jamais.
 *
 * Logique pure, sans React ni window : testée par tests/transfer.test.mjs.
 */

export const TRANSFER_FORMAT = "mundi-transfert";
export const TRANSFER_VERSION = 1;

/** Clés transférées, avec leurs schémas réels (lib/bookmarks, follows, preferences, revision, theme, intro). */
export const TRANSFER_KEYS = ["mundi:bookmarks", "mundi:follows:v1", "mundi:topics:v1", "mundi:revision:v1", "mundi:theme", "mundi:intro:v2"] as const;
export type TransferKey = (typeof TRANSFER_KEYS)[number];

type Follow = { followedAt: string; seen: string[] };
type Review = { level: number; nextAt: string; lastAt: string };
export type TransferData = {
  "mundi:bookmarks"?: string[];
  "mundi:follows:v1"?: Record<string, Follow>;
  "mundi:topics:v1"?: string[];
  "mundi:revision:v1"?: Record<string, Review>;
  "mundi:theme"?: "light" | "dark";
  "mundi:intro:v2"?: string;
};
export type TransferPackage = { format: typeof TRANSFER_FORMAT; version: number; exportedAt: string; from: string; data: TransferData };

const TOPICS = new Set([
  "geopolitique", "economie", "finance", "industrie", "materiaux-critiques", "energie", "recyclage",
  "environnement", "technologie", "entreprises", "afrique", "sciences-societe",
]);
const MAX_ITEMS = 2000;
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const shortStr = (v: unknown, max = 300): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const isDate = (v: unknown): v is string => shortStr(v, 40) && !Number.isNaN(Date.parse(v));

function json(raw: string | null | undefined): unknown {
  if (raw == null) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

/** Nettoie chaque valeur selon son schéma ; ce qui ne correspond pas est ignoré, sans erreur. */
export function cleanData(input: unknown): TransferData {
  const src = isObj(input) ? input : {};
  const out: TransferData = {};
  const b = src["mundi:bookmarks"];
  if (Array.isArray(b)) {
    const list = [...new Set(b.filter((x) => shortStr(x)))].slice(0, MAX_ITEMS);
    if (list.length) out["mundi:bookmarks"] = list;
  }
  const f = src["mundi:follows:v1"];
  if (isObj(f)) {
    const follows: Record<string, Follow> = {};
    for (const [id, v] of Object.entries(f).slice(0, MAX_ITEMS)) {
      if (!shortStr(id, 200) || !isObj(v) || !isDate(v.followedAt) || !Array.isArray(v.seen)) continue;
      // Les mises à jour simulées (aperçus seulement) ne sont pas transférées.
      follows[id] = { followedAt: v.followedAt, seen: [...new Set(v.seen.filter((s) => shortStr(s, 200)))].slice(0, MAX_ITEMS) };
    }
    if (Object.keys(follows).length) out["mundi:follows:v1"] = follows;
  }
  const t = src["mundi:topics:v1"];
  if (Array.isArray(t)) {
    const topics = [...new Set(t.filter((x): x is string => typeof x === "string" && TOPICS.has(x)))];
    if (topics.length) out["mundi:topics:v1"] = topics;
  }
  const r = src["mundi:revision:v1"];
  if (isObj(r)) {
    const rev: Record<string, Review> = {};
    for (const [slug, v] of Object.entries(r).slice(0, MAX_ITEMS)) {
      if (!shortStr(slug, 200) || !isObj(v)) continue;
      const level = v.level;
      if (typeof level === "number" && Number.isInteger(level) && level >= 0 && level <= 5 && isDate(v.nextAt) && isDate(v.lastAt))
        rev[slug] = { level, nextAt: v.nextAt, lastAt: v.lastAt };
    }
    if (Object.keys(rev).length) out["mundi:revision:v1"] = rev;
  }
  const theme = src["mundi:theme"];
  if (theme === "light" || theme === "dark") out["mundi:theme"] = theme;
  const intro = src["mundi:intro:v2"];
  if (shortStr(intro, 40)) out["mundi:intro:v2"] = intro;
  return out;
}

/** Lit les données transférables depuis un stockage (localStorage ou équivalent). */
export function readLocal(get: (key: string) => string | null): TransferData {
  const raw: Record<string, unknown> = {};
  for (const key of TRANSFER_KEYS) {
    let value: string | null = null;
    try { value = get(key); } catch { value = null; }
    // Thème et heure de première visite sont rangés tels quels, le reste en JSON.
    raw[key] = key === "mundi:theme" || key === "mundi:intro:v2" ? value ?? undefined : json(value);
  }
  return cleanData(raw);
}

export function makePackage(data: TransferData, from: string, now = new Date()): TransferPackage {
  return { format: TRANSFER_FORMAT, version: TRANSFER_VERSION, exportedAt: now.toISOString(), from, data: cleanData(data) };
}

/** Vérifie un paquet reçu (lien ou fichier). Renvoie null s'il n'est pas reconnu. */
export function parsePackage(input: unknown): TransferPackage | null {
  const value = typeof input === "string" ? json(input) : input;
  if (!isObj(value) || value.format !== TRANSFER_FORMAT || value.version !== TRANSFER_VERSION) return null;
  return {
    format: TRANSFER_FORMAT, version: TRANSFER_VERSION,
    exportedAt: isDate(value.exportedAt) ? value.exportedAt : new Date(0).toISOString(),
    from: shortStr(value.from, 200) ? value.from : "",
    data: cleanData(value.data),
  };
}

const earlier = (a: string, b: string) => (Date.parse(a) <= Date.parse(b) ? a : b);

/**
 * Fusionne les données importées avec celles déjà présentes, sans doublon.
 * Importer deux fois le même paquet ne change rien la seconde fois.
 * - favoris : ceux déjà présents d'abord, puis les nouveaux ;
 * - dossiers suivis : date de suivi la plus ancienne, mises à jour vues réunies ;
 * - sujets : réunis ;
 * - Réviser : pour chaque carte, la révision la plus récente l'emporte ;
 * - thème et première visite : le réglage déjà présent l'emporte.
 */
export function mergeData(current: TransferData, incoming: TransferData): TransferData {
  const a = cleanData(current);
  const b = cleanData(incoming);
  const out: TransferData = { ...a };
  if (b["mundi:bookmarks"]) out["mundi:bookmarks"] = [...new Set([...(a["mundi:bookmarks"] ?? []), ...b["mundi:bookmarks"]])];
  if (b["mundi:follows:v1"]) {
    const follows = { ...(a["mundi:follows:v1"] ?? {}) };
    for (const [id, f] of Object.entries(b["mundi:follows:v1"])) {
      const mine = follows[id];
      follows[id] = mine ? { followedAt: earlier(mine.followedAt, f.followedAt), seen: [...new Set([...mine.seen, ...f.seen])] } : f;
    }
    out["mundi:follows:v1"] = follows;
  }
  if (b["mundi:topics:v1"]) out["mundi:topics:v1"] = [...new Set([...(a["mundi:topics:v1"] ?? []), ...b["mundi:topics:v1"]])];
  if (b["mundi:revision:v1"]) {
    const rev = { ...(a["mundi:revision:v1"] ?? {}) };
    for (const [slug, r] of Object.entries(b["mundi:revision:v1"])) {
      const mine = rev[slug];
      rev[slug] = !mine || Date.parse(r.lastAt) > Date.parse(mine.lastAt) ? r : mine;
    }
    out["mundi:revision:v1"] = rev;
  }
  if (!a["mundi:theme"] && b["mundi:theme"]) out["mundi:theme"] = b["mundi:theme"];
  if (!a["mundi:intro:v2"] && b["mundi:intro:v2"]) out["mundi:intro:v2"] = b["mundi:intro:v2"];
  return out;
}

/** Valeurs à écrire dans le stockage, clé par clé (texte brut comme le reste du site). */
export function toStorage(data: TransferData): [TransferKey, string][] {
  const out: [TransferKey, string][] = [];
  for (const key of TRANSFER_KEYS) {
    const v = data[key];
    if (v === undefined) continue;
    out.push([key, typeof v === "string" ? v : JSON.stringify(v)]);
  }
  return out;
}

/** Ce que contient un paquet, en clair, pour le montrer avant d'importer. */
export function summary(data: TransferData) {
  return {
    bookmarks: data["mundi:bookmarks"]?.length ?? 0,
    follows: Object.keys(data["mundi:follows:v1"] ?? {}).length,
    topics: data["mundi:topics:v1"]?.length ?? 0,
    revision: Object.keys(data["mundi:revision:v1"] ?? {}).length,
    theme: data["mundi:theme"] ?? null,
  };
}

export const isEmpty = (data: TransferData) => Object.keys(cleanData(data)).filter((k) => k !== "mundi:intro:v2").length === 0;

/** Encodage du paquet après le « # » du lien (base64url de l'UTF-8). */
export function encodeLink(pkg: TransferPackage): string {
  const bytes = new TextEncoder().encode(JSON.stringify(pkg));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeLink(fragment: string): TransferPackage | null {
  try {
    const b64 = fragment.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return parsePackage(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { return null; }
}
