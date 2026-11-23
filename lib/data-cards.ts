/**
 * Cartes de données MUNDI (ticket #25) : schéma typé et validation.
 *
 * Ces cartes affichent des chiffres APPROUVÉS, fournis avec leur unité, leur
 * périmètre, leur période, leur dénominateur éventuel et leur source. Les
 * composants ne calculent ni n'inventent aucun chiffre : ils mettent en forme
 * ce qui est décrit ici. La direction artistique (ticket #26) est fournie
 * par ChatGPT via les paramètres de style et les emplacements de visuels.
 */

export const DATA_CARDS_FORMAT = "mundi-data-cards-v1";

export type DataSource = { label: string; url: string };

/** Une valeur chiffrée, toujours accompagnée de son unité et de son contexte. */
export type Measure = {
  value: number;
  /** Unité affichée telle quelle : « millions de tonnes », « % », « kg par habitant »… */
  unit: string;
  /** Ce que la valeur mesure exactement : « déchets textiles générés ». */
  label: string;
  /** Zone géographique ou population couverte : « Union européenne (27 pays) ». */
  scope: string;
  /** Période couverte : « 2024 », « 1er trimestre 2026 ». */
  period: string;
  /** Obligatoire pour un pourcentage ou un ratio : « des déchets textiles traités ». */
  denominator?: string;
  /** Nombre de décimales à afficher (0 à 3). Par défaut : celles de la valeur. */
  decimals?: number;
};

/** Visuel original conçu et fourni par la direction artistique (ChatGPT, ticket #26). */
export type VisualSlot = {
  kind: "illustration" | "svg";
  /** Fichier local du dépôt, sous /media/visuels/ : aucun lien vers un site tiers. */
  src: string;
  /** Description pour les lecteurs d'écran ; vide si purement décoratif. */
  alt: string;
  decorative?: boolean;
  credit: string;
  license: string;
  /** Personne qui a validé le visuel. */
  approvedBy: string;
};

/** Paramètres de style limités aux jetons de la marque, pour reproduire les maquettes. */
export type DataCardStyle = {
  tone?: "night" | "ivory";
  accent?: "mint" | "blue" | "amber" | "topic";
  emphasis?: "display" | "sans";
};

type CardBase = {
  id: string;
  /** Accroche courte, au-dessus de la donnée. */
  headline: string;
  source: DataSource;
  /** Date de la donnée ou de sa dernière mise à jour par la source (AAAA-MM-JJ). */
  asOf: string;
  /** Note méthodologique : définitions, limites, précautions de lecture. */
  note?: string;
  visual?: VisualSlot;
  style?: DataCardStyle;
};

export type StatCard = CardBase & { kind: "stat"; measure: Measure; context?: string };

export type ComparisonCard = CardBase & {
  kind: "comparaison";
  /** 2 à 4 valeurs. */
  items: Measure[];
  /**
   * « echelle-commune » : barres proportionnelles, seulement si toutes les valeurs
   * ont la même unité ET le même dénominateur.
   * « valeurs-distinctes » : valeurs côte à côte, sans barre commune (dénominateurs différents).
   */
  presentation: "echelle-commune" | "valeurs-distinctes";
};

export type ExplanationStep = { label: string; text: string; nature: "fait" | "hypothese" };
export type ExplanationCard = CardBase & {
  kind: "explication";
  steps: ExplanationStep[];
  /**
   * « sequence » (par défaut) : étapes numérotées, dans l'ordre.
   * « alternatives » : la première étape est le point de départ, les suivantes
   * sont des issues possibles (« ou »), sans ordre ni numéro (ex. : réemploi OU recyclage).
   */
  layout?: "sequence" | "alternatives";
};

export type DataCard = StatCard | ComparisonCard | ExplanationCard;

const isText = (v: unknown, min = 1, max = 400) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isRatio = (unit: string) => /%|pour ?cent|pour ?mille|‰|part|taux|ratio/i.test(unit);

function httpsUrl(v: unknown): boolean {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

function checkMeasure(m: unknown, where: string, errors: string[]) {
  if (!m || typeof m !== "object") return void errors.push(`${where} : valeur manquante`);
  const x = m as Record<string, unknown>;
  if (typeof x.value !== "number" || !Number.isFinite(x.value)) errors.push(`${where} : la valeur doit être un nombre`);
  if (!isText(x.unit, 1, 60)) errors.push(`${where} : unité manquante`);
  if (!isText(x.label, 3, 120)) errors.push(`${where} : préciser ce que mesure la valeur`);
  if (!isText(x.scope, 2, 120)) errors.push(`${where} : périmètre manquant`);
  if (!isText(x.period, 2, 60)) errors.push(`${where} : période manquante`);
  if (typeof x.unit === "string" && isRatio(x.unit) && !isText(x.denominator, 3, 120)) {
    errors.push(`${where} : un pourcentage ou un ratio doit indiquer son dénominateur`);
  }
  if (x.decimals !== undefined && (!Number.isInteger(x.decimals) || (x.decimals as number) < 0 || (x.decimals as number) > 3)) {
    errors.push(`${where} : nombre de décimales invalide`);
  }
}

function checkVisual(v: unknown, where: string, errors: string[]) {
  if (v === undefined) return;
  const x = (v ?? {}) as Record<string, unknown>;
  if (!["illustration", "svg"].includes(String(x.kind))) errors.push(`${where} : type de visuel inconnu`);
  if (typeof x.src !== "string" || !/^\/media\/visuels\/[a-z0-9][a-z0-9._/-]*\.(svg|png|jpe?g|webp|avif)$/i.test(x.src) || x.src.includes("..")) {
    errors.push(`${where} : le visuel doit être un fichier local sous /media/visuels/`);
  }
  if (!x.decorative && !isText(x.alt, 5, 300)) errors.push(`${where} : description du visuel manquante`);
  if (!isText(x.credit, 2) || !isText(x.license, 2) || !isText(x.approvedBy, 2)) errors.push(`${where} : crédit, licence et validation du visuel requis`);
}

/** Validation technique d'une séquence (2 à 4 cartes). Ne vérifie pas l'exactitude des chiffres. */
export function validateDataCards(value: unknown): string[] {
  if (!Array.isArray(value)) return ["La séquence doit être une liste de cartes"];
  const errors: string[] = [];
  if (value.length < 2 || value.length > 4) errors.push("Une séquence contient 2 à 4 cartes");
  const ids = new Set<string>();
  value.forEach((card, i) => {
    const where = `Carte ${i + 1}`;
    if (!card || typeof card !== "object") return void errors.push(`${where} : carte invalide`);
    const c = card as Record<string, unknown>;
    if (typeof c.id !== "string" || !/^[a-z0-9-]{1,60}$/.test(c.id) || ids.has(c.id)) errors.push(`${where} : identifiant manquant ou en double`);
    else ids.add(c.id);
    if (!isText(c.headline, 3, 140)) errors.push(`${where} : accroche manquante ou trop longue (140 caractères)`);
    const s = (c.source ?? {}) as Record<string, unknown>;
    if (!isText(s.label, 2, 120) || !httpsUrl(s.url)) errors.push(`${where} : source HTTPS requise`);
    if (!isDate(c.asOf)) errors.push(`${where} : date de la donnée invalide (AAAA-MM-JJ)`);
    if (c.note !== undefined && !isText(c.note, 3, 400)) errors.push(`${where} : note méthodologique invalide`);
    checkVisual(c.visual, where, errors);
    if (c.kind === "stat") {
      checkMeasure(c.measure, where, errors);
    } else if (c.kind === "comparaison") {
      const items = Array.isArray(c.items) ? c.items : [];
      if (items.length < 2 || items.length > 4) errors.push(`${where} : une comparaison contient 2 à 4 valeurs`);
      items.forEach((m, j) => checkMeasure(m, `${where}, valeur ${j + 1}`, errors));
      if (c.presentation === "echelle-commune") {
        const units = new Set(items.map((m) => (m as Measure)?.unit));
        const dens = new Set(items.map((m) => (m as Measure)?.denominator ?? ""));
        if (units.size > 1 || dens.size > 1) {
          errors.push(`${where} : une échelle commune exige la même unité et le même dénominateur ; utilisez « valeurs-distinctes »`);
        }
        if (items.some((m) => typeof (m as Measure)?.value === "number" && (m as Measure).value < 0)) errors.push(`${where} : pas de barres pour des valeurs négatives`);
      } else if (c.presentation !== "valeurs-distinctes") {
        errors.push(`${where} : présentation inconnue`);
      }
    } else if (c.kind === "explication") {
      const steps = Array.isArray(c.steps) ? c.steps : [];
      if (steps.length < 2 || steps.length > 5) errors.push(`${where} : une explication contient 2 à 5 étapes`);
      if (c.layout !== undefined && c.layout !== "sequence" && c.layout !== "alternatives") errors.push(`${where} : présentation d'explication inconnue (sequence ou alternatives)`);
      if (c.layout === "alternatives" && steps.length < 3) errors.push(`${where} : des alternatives exigent un point de départ et au moins deux issues`);
      steps.forEach((st, j) => {
        const x = (st ?? {}) as Record<string, unknown>;
        if (!isText(x.label, 2, 60) || !isText(x.text, 5, 240) || !["fait", "hypothese"].includes(String(x.nature))) {
          errors.push(`${where}, étape ${j + 1} : titre, texte et nature (fait ou hypothese) requis`);
        }
      });
    } else {
      errors.push(`${where} : type inconnu (stat, comparaison ou explication)`);
    }
  });
  return errors;
}

/** Affichage français d'une valeur, sans arrondi caché au-delà des décimales demandées. */
export function formatValue(m: Pick<Measure, "value" | "decimals">): string {
  const decimals = m.decimals ?? Math.min(3, (String(m.value).split(".")[1] ?? "").length);
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(m.value);
}

/** Phrase complète, lisible par un lecteur d'écran. */
export function describeMeasure(m: Measure): string {
  return `${m.label} : ${formatValue(m)} ${m.unit}${m.denominator ? ` ${m.denominator}` : ""}, ${m.scope}, ${m.period}.`;
}

/** Taille maximale d'un fichier de cartes importé dans l'atelier. */
export const MAX_DATA_CARDS_BYTES = 40_000;

export type ParsedDataCards = { ok: true; cards: DataCard[] } | { ok: false; errors: string[] };

/**
 * Lecture d'un fichier « mundi-data-cards-v1 » ({ format, cards }) dans l'atelier.
 * Le résultat reste un brouillon : rien n'est publié, aucune valeur n'est modifiée.
 */
export function parseDataCards(text: string): ParsedDataCards {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Le fichier n'est pas un JSON valide."] };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: ["Format attendu : { \"format\": \"mundi-data-cards-v1\", \"cards\": [...] }"] };
  const r = raw as Record<string, unknown>;
  if (r.format !== DATA_CARDS_FORMAT) return { ok: false, errors: [`Format inconnu : « ${DATA_CARDS_FORMAT} » attendu.`] };
  const errors = validateDataCards(r.cards);
  return errors.length ? { ok: false, errors } : { ok: true, cards: r.cards as DataCard[] };
}
