export type TopicSlug =
  | "geopolitique"
  | "economie"
  | "finance"
  | "industrie"
  | "materiaux-critiques"
  | "energie"
  | "recyclage"
  | "environnement"
  | "technologie"
  | "entreprises"
  | "afrique"
  | "sciences-societe";

export type Topic = {
  slug: TopicSlug;
  name: string;
  description: string;
  /** Couleur d'accent utilisée pour les visuels génératifs. */
  color: string;
  /** Motif abstrait utilisé pour illustrer les récits du sujet. */
  pattern: VisualPattern;
};

export type VisualPattern = "orbits" | "waves" | "grid" | "routes" | "bars" | "rings";

export type FormatSlug = "flash" | "decryptage" | "grand-angle" | "en-chiffres";

export type Format = {
  slug: FormatSlug;
  name: string;
  duration: string;
  description: string;
};

/**
 * Nature d'un bloc de contenu. La ligne éditoriale impose de distinguer
 * clairement les faits, les analyses et les hypothèses.
 */
export type BlockKind = "fait" | "analyse" | "hypothese";

export type StorySection = {
  kind: BlockKind;
  heading: string;
  paragraphs: string[];
};

export type DemoSource = {
  label: string;
  note: string;
};

export type ChartData = {
  title: string;
  unit: string;
  period: string;
  origin: string;
  points: { label: string; value: number }[];
};

export type Story = {
  slug: string;
  title: string;
  dek: string;
  topic: TopicSlug;
  format: FormatSlug;
  /** Durée de lecture ou de visionnage estimée, en minutes. */
  minutes: number;
  publishedAt: string;
  updatedAt: string;
  keyPoints: string[];
  sections: StorySection[];
  perspectives?: { label: string; text: string }[];
  uncertainties: string[];
  sources: DemoSource[];
  chart?: ChartData;
  /** Tous les contenus du prototype sont illustratifs. */
  isDemo: true;
};
