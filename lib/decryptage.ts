/**
 * Pilote V2 « Aujourd'hui » (ticket 109) : couche de décryptage posée sur un article publié.
 *
 * Le décryptage ne remplace jamais l'article : il le réorganise en trois niveaux
 * (L'essentiel, Comprendre, Approfondir) à partir du seul texte publié et de ses sources.
 * Chaque chiffre renvoie à une source de l'article (par son numéro) et précise son périmètre.
 * Les données vivent dans content/decryptages.json ; une entrée mal formée fait échouer la construction.
 */

export type DecryptageQuestion = {
  question: string;
  answer: string;
  /** Numéros (à partir de 0) des sources de l'article qui appuient la réponse. */
  sources: number[];
  /** « analyse » : lecture de MUNDI, pas un fait attribué à une source. */
  nature?: "analyse";
};

export type DecryptageFigure = { value: string; label: string; scope: string; source: number };

export type DecryptageVisual =
  | { type: "carte"; id: "shaba"; title: string; caption: string; alt: string; credit: string; license: string }
  | {
      type: "graphique"; id: string; title: string; caption: string; alt: string; credit: string; license: string;
      bars: { label: string; value: number; unit: string }[];
      split?: { label: string; parts: { label: string; value: number; note?: string }[] };
    }
  /** Archive : la photo du catalogue de l'article (crédit et licence repris du catalogue). */
  | { type: "archive"; title: string; caption: string; alt: string };

export type Decryptage = {
  format: string;
  shortTitle: string;
  essentiel: { fait: string; consequence: string };
  /** Date du fait (et non de la publication), au format AAAA-MM-JJ, avec un libellé lisible. */
  eventDate?: string;
  eventDateLabel?: string;
  questions: [DecryptageQuestion, DecryptageQuestion, DecryptageQuestion];
  figures: DecryptageFigure[];
  visual?: DecryptageVisual;
  link?: { slug: string; label: string; text: string };
  quiz: { question: string; answer: string; explanation: string };
  audioScript?: string;
  verification: {
    /** « humain » : l'article a été relu par une personne ; « ia » : vérifié par l'IA seule. */
    status: "ia" | "humain";
    writtenBy: string;
    checkedAt: string;
    toReview: string[];
  };
  /** Raison pour laquelle le sujet remonte en relecture (conflit, finance, santé…). */
  sensitive?: string;
};

const QUESTIONS = ["Que s'est-il passé ?", "Pourquoi ça compte ?", "Qu'est-ce qui reste incertain ?"];
const str = (v: unknown, min = 1, max = 10_000) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
/** Deux phrases au plus : le fait, puis sa conséquence (contrôle simple sur la ponctuation finale). */
const sentences = (s: string) => (s.match(/[.!?…](\s|$)/g) ?? []).length;

/** Validation technique d'un décryptage par rapport à l'article qu'il accompagne. */
export function validateDecryptage(slug: string, value: unknown, sourceCount: number): string[] {
  const e: string[] = [];
  if (!value || typeof value !== "object") return [`${slug} : entrée invalide`];
  const d = value as Decryptage;
  const src = (i: unknown) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < sourceCount;
  if (!str(d.format, 3, 40)) e.push("format manquant");
  if (!str(d.shortTitle, 12, 70)) e.push("titre court de 12 à 70 caractères");
  if (!str(d.essentiel?.fait, 30, 220) || !str(d.essentiel?.consequence, 30, 220)) e.push("l'essentiel : un fait et une conséquence de 30 à 220 caractères");
  else if (sentences(d.essentiel.fait) + sentences(d.essentiel.consequence) > 2) e.push("l'essentiel : deux phrases au maximum");
  if (d.eventDate !== undefined && !date(d.eventDate)) e.push("date du fait invalide");
  if (!Array.isArray(d.questions) || d.questions.length !== 3) e.push("trois questions requises");
  else d.questions.forEach((q, i) => {
    if (q?.question !== QUESTIONS[i]) e.push(`question ${i + 1} : « ${QUESTIONS[i]} » attendue`);
    if (!str(q?.answer, 60, 900)) e.push(`question ${i + 1} : réponse de 60 à 900 caractères`);
    if (!Array.isArray(q?.sources) || !q.sources.every(src)) e.push(`question ${i + 1} : numéros de sources invalides`);
    if (q?.nature !== "analyse" && !q?.sources?.length) e.push(`question ${i + 1} : une source, ou nature « analyse »`);
  });
  if (!Array.isArray(d.figures) || !d.figures.every((f) => f && str(f.value) && str(f.label, 3) && str(f.scope, 3) && src(f.source))) e.push("chaque chiffre doit avoir une valeur, un libellé, un périmètre et une source de l'article");
  if (!str(d.quiz?.question, 10, 200) || !d.quiz.question.trim().endsWith("?") || !str(d.quiz?.answer, 2, 200) || !str(d.quiz?.explanation, 20, 500)) e.push("question / réponse expliquée invalide");
  if (d.audioScript !== undefined) {
    // 45 à 75 secondes à environ 16 caractères par seconde (voix SIWIS, vitesse 1,05).
    if (!str(d.audioScript, 700, 1250)) e.push("script parlé : 700 à 1 250 caractères (45 à 75 secondes)");
  }
  if (!["ia", "humain"].includes(d.verification?.status) || !str(d.verification?.writtenBy, 3) || !date(d.verification?.checkedAt) || !Array.isArray(d.verification?.toReview)) e.push("statut de vérification incomplet");
  const v = d.visual;
  if (v) {
    if (!["carte", "graphique", "archive"].includes(v.type) || !str(v.title, 5) || !str(v.caption, 20) || !str(v.alt, 20)) e.push("visuel : type, titre, légende et texte alternatif requis");
    if (v.type !== "archive" && (!str(v.credit, 5) || !str(v.license, 5))) e.push("visuel : crédit et licence requis");
    if (v.type === "graphique" && (!v.bars?.length || !v.bars.every((b) => b.value > 0 && str(b.unit)))) e.push("graphique : barres invalides");
    if (v.type === "graphique" && v.split && Math.round(v.split.parts.reduce((s, p) => s + p.value, 0)) !== 100) e.push("graphique : la répartition doit totaliser 100 %");
  }
  if (d.link && (!str(d.link.slug) || !str(d.link.label, 3) || !str(d.link.text, 20))) e.push("lien contextualisé invalide");
  return e.map((m) => `${slug} : ${m}`);
}
