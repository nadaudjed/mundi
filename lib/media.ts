/**
 * Bibliothèque de médias de démonstration.
 *
 * Règle : aucun média n'entre ici sans auteur, licence et provenance
 * vérifiables. Les fichiers actuels sont des créations originales générées
 * par scripts/generate-demo-media.mjs (voir public/media/demo/README.md).
 */

export type MediaCredit = {
  /** Auteur ou ayant droit. */
  author: string;
  /** Licence ou conditions d'utilisation. */
  license: string;
  /** D'où vient le fichier, et comment le vérifier. */
  provenance: string;
  licenseUrl?: string;
};

export type ImageMedia = {
  kind: "image";
  id: string;
  /** "photo" pour une photographie, "illustration" pour un dessin ou schéma. */
  nature: "photo" | "illustration";
  src: string;
  width: number;
  height: number;
  alt: string;
  credit: MediaCredit;
};

export type VideoMedia = {
  kind: "video";
  id: string;
  /** Sources par ordre de préférence : le navigateur prend la première qu'il sait lire. */
  sources: { src: string; type: "video/webm" | "video/mp4" }[];
  poster: string;
  width: number;
  height: number;
  durationSeconds: number;
  /** Faux si le fichier n'a pas de piste sonore : le bouton « son » est alors masqué. */
  hasAudio: boolean;
  captions: { src: string; srclang: string; label: string };
  /** Description textuelle de ce que montre la vidéo (accessibilité). */
  description: string;
  credit: MediaCredit;
};

export type Media = ImageMedia | VideoMedia;

const ORIGINAL: MediaCredit = {
  author: "MUNDI",
  license: "Création originale, droits détenus par MUNDI",
  provenance: "Générée par scripts/generate-demo-media.mjs dans le dépôt MUNDI. Schéma illustratif, sans données réelles.",
};

export const mediaLibrary: Record<string, Media> = {
  "reseau-electrique": {
    kind: "video",
    id: "reseau-electrique",
    sources: [
      { src: "/media/demo/reseau-electrique.webm", type: "video/webm" },
      { src: "/media/demo/reseau-electrique.mp4", type: "video/mp4" },
    ],
    poster: "/media/demo/reseau-electrique-poster.jpg",
    width: 720,
    height: 1280,
    durationSeconds: 8,
    hasAudio: false,
    captions: { src: "/media/demo/reseau-electrique.fr.vtt", srclang: "fr", label: "Français" },
    description:
      "Animation : une balance oppose production et consommation d'électricité. La consommation augmente, la balance penche et la jauge de fréquence s'écarte de sa référence ; une batterie s'ajoute côté production et l'équilibre revient.",
    credit: ORIGINAL,
  },
  detroit: {
    kind: "video",
    id: "detroit",
    sources: [
      { src: "/media/demo/detroit.webm", type: "video/webm" },
      { src: "/media/demo/detroit.mp4", type: "video/mp4" },
    ],
    poster: "/media/demo/detroit-poster.jpg",
    width: 720,
    height: 1280,
    durationSeconds: 8,
    hasAudio: false,
    captions: { src: "/media/demo/detroit.fr.vtt", srclang: "fr", label: "Français" },
    description:
      "Animation schématique : des navires traversent un passage étroit entre deux mers. Le passage se bloque, les navires contournent par une route plus longue et la barre « durée du trajet » s'allonge. Ce n'est pas une carte.",
    credit: ORIGINAL,
  },
  "metaux-critiques": {
    kind: "image",
    id: "metaux-critiques",
    nature: "illustration",
    src: "/media/demo/metaux-critiques.jpg",
    width: 1080,
    height: 1350,
    alt: "Illustration : quatre tuiles Lithium, Cobalt, Nickel et Néodyme, puis une chaîne Extraction, Raffinage, Fabrication.",
    credit: ORIGINAL,
  },
  "recyclage-batterie": {
    kind: "image",
    id: "recyclage-batterie",
    nature: "illustration",
    src: "/media/demo/recyclage-batterie.jpg",
    width: 1080,
    height: 1350,
    alt: "Schéma : une batterie usagée est broyée, donne une « masse noire », dont on récupère des métaux.",
    credit: ORIGINAL,
  },
  correlation: {
    kind: "image",
    id: "correlation",
    nature: "illustration",
    src: "/media/demo/correlation.jpg",
    width: 1080,
    height: 1350,
    alt: "Illustration : deux courbes, ventes de glaces et coups de soleil, montent ensemble ; un soleil relié aux deux explique leur hausse.",
    credit: ORIGINAL,
  },
};

/** Média principal associé à chaque récit (les autres gardent leur visuel génératif). */
const storyMediaIds: Record<string, string> = {
  "equilibre-reseau-electrique": "reseau-electrique",
  "detroits-commerce-mondial": "detroit",
  "pourquoi-certains-metaux-sont-critiques": "metaux-critiques",
  "recycler-une-batterie": "recyclage-batterie",
  "correlation-causalite": "correlation",
};

export function getStoryMedia(slug: string): Media | undefined {
  const id = storyMediaIds[slug];
  return id ? mediaLibrary[id] : undefined;
}

/** Vérifie qu'un média porte bien ses informations de droits. */
export function hasCompleteCredit(media: Media): boolean {
  const { author, license, provenance } = media.credit;
  return [author, license, provenance].every((v) => v.trim().length > 0);
}
