/**
 * Couverture typographique : un grand mot-clé (ou un chiffre) sur fond uni.
 * Remplace les visuels abstraits générés. Purement décorative : le sens est
 * porté par le titre et le texte qui l'accompagnent.
 */
export function TypeCover({ word, tone = "night", className = "" }: { word: string; tone?: "night" | "page" | "paper"; className?: string }) {
  const colors = tone === "night" ? "bg-night text-ivory/90" : tone === "paper" ? "bg-ivory-2 text-graphite" : "bg-surface text-ink";
  return (
    <div aria-hidden="true" data-visual="typographie" className={`@container flex items-end overflow-hidden p-[6%] ${colors} ${className}`}>
      <span className="font-display text-[clamp(1.5rem,16cqi,7rem)] leading-[0.9] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">{word}</span>
    </div>
  );
}
