import type { Format, FormatSlug, Topic, TopicSlug } from "./types";

export const topics: Topic[] = [
  { slug: "geopolitique", name: "Géopolitique", description: "Rapports de force, frontières, alliances et routes stratégiques.", color: "#246BCE", pattern: "routes" },
  { slug: "economie", name: "Économie", description: "Prix, croissance, emploi et politiques économiques.", color: "#E0A43A", pattern: "bars" },
  { slug: "finance", name: "Finance", description: "Marchés, taux, monnaies et circulation des capitaux.", color: "#7C6CF2", pattern: "waves" },
  { slug: "industrie", name: "Industrie", description: "Usines, chaînes de production et souveraineté industrielle.", color: "#E46B4F", pattern: "grid" },
  { slug: "materiaux-critiques", name: "Matériaux critiques", description: "Métaux, minerais et ressources dont dépendent nos technologies.", color: "#C98A4B", pattern: "rings" },
  { slug: "energie", name: "Énergie", description: "Production, réseaux, stockage et transitions énergétiques.", color: "#F2C14E", pattern: "waves" },
  { slug: "recyclage", name: "Recyclage", description: "Économie circulaire, déchets et seconde vie des matériaux.", color: "#20B99A", pattern: "orbits" },
  { slug: "environnement", name: "Environnement", description: "Climat, biodiversité et données environnementales.", color: "#3FA36B", pattern: "bars" },
  { slug: "technologie", name: "Technologie", description: "Numérique, semi-conducteurs, IA et infrastructures.", color: "#4FB3E8", pattern: "grid" },
  { slug: "entreprises", name: "Entreprises", description: "Stratégies, chaînes d'approvisionnement et organisation.", color: "#D9668F", pattern: "routes" },
  { slug: "afrique", name: "Afrique", description: "Dynamiques économiques, politiques et culturelles du continent.", color: "#E88B3A", pattern: "rings" },
  { slug: "sciences-societe", name: "Sciences & société", description: "Méthode scientifique, santé, éducation et débats publics.", color: "#9C8CF0", pattern: "orbits" },
];

export const formats: Record<FormatSlug, Format> = {
  flash: { slug: "flash", name: "Flash", duration: "30–60 s", description: "L'essentiel en un regard." },
  decryptage: { slug: "decryptage", name: "Décryptage", duration: "1–3 min", description: "Mécanismes et contexte." },
  "grand-angle": { slug: "grand-angle", name: "Grand angle", duration: "3–8 min", description: "Plusieurs angles, données et limites." },
  "en-chiffres": { slug: "en-chiffres", name: "En chiffres", duration: "1–2 min", description: "Une visualisation, son unité, sa période et son origine." },
};

const topicMap = new Map(topics.map((t) => [t.slug, t]));

export function getTopic(slug: TopicSlug | string): Topic | undefined {
  return topicMap.get(slug as TopicSlug);
}
