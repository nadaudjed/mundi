/**
 * Récits « une idée par écran » : l'accroche, le fait, l'explication.
 * Chaque écran reprend uniquement des éléments déjà présents dans le récit
 * de démonstration correspondant (lib/stories.ts) : rien de nouveau n'est affirmé.
 */
export type NarrativeBeat = { kind: "accroche" | "fait" | "explication"; label: string; text: string };

const narratives: Record<string, NarrativeBeat[]> = {
  "equilibre-reseau-electrique": [
    { kind: "accroche", label: "L'accroche", text: "L'électricité se stocke mal. Alors comment les lumières restent-elles allumées ?" },
    { kind: "fait", label: "Le fait", text: "À chaque seconde, la production doit égaler la consommation. La fréquence du réseau sert de thermomètre à cet équilibre." },
    { kind: "explication", label: "L'explication", text: "Solaire et éolien suivent la météo, pas la demande : batteries, barrages pompés et consommation décalée aident à garder l'équilibre." },
  ],
  "detroits-commerce-mondial": [
    { kind: "accroche", label: "L'accroche", text: "Quelques couloirs maritimes étroits tiennent une grande partie du commerce mondial." },
    { kind: "fait", label: "Le fait", text: "Ormuz, Malacca, Suez, Bab-el-Mandeb, Panama : ces passages raccourcissent considérablement les trajets." },
    { kind: "explication", label: "L'explication", text: "Quand un passage est perturbé, les navires attendent ou contournent : délais, assurance et fret coûtent plus cher." },
  ],
  "pourquoi-certains-metaux-sont-critiques": [
    { kind: "accroche", label: "L'accroche", text: "Un métal peut être abondant dans le sol et pourtant « critique »." },
    { kind: "fait", label: "Le fait", text: "Est critique un matériau à la fois important pour l'économie et exposé à un risque d'approvisionnement." },
    { kind: "explication", label: "L'explication", text: "Le risque vient de la concentration : quelques pays extraient ou raffinent la ressource, ce qui crée des dépendances." },
  ],
  "correlation-causalite": [
    { kind: "accroche", label: "L'accroche", text: "Les ventes de glaces et les coups de soleil montent ensemble. Les glaces donnent-elles des coups de soleil ?" },
    { kind: "fait", label: "Le fait", text: "Une corrélation dit seulement que deux phénomènes varient ensemble." },
    { kind: "explication", label: "L'explication", text: "Un troisième facteur, ici le soleil, peut expliquer les deux. Pour établir une cause, on utilise des essais contrôlés." },
  ],
};

export function getNarrative(slug: string): NarrativeBeat[] | undefined {
  return narratives[slug];
}
