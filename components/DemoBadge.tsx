/** Mention « Démonstration » : simple texte, sans pastille. */
export function DemoBadge({ tone = "dark", label = "Démonstration" }: { tone?: "dark" | "light"; label?: string }) {
  return <span className={`inline-flex whitespace-nowrap text-meta font-semibold ${tone === "light" ? "text-[#ffd98f]" : "text-[#7a5410]"}`}>{label}</span>;
}

export function DemoNotice({ className = "" }: { className?: string }) {
  return (
    <div role="note" className={`border-l-2 border-amber py-1 pl-4 text-sm leading-relaxed text-muted ${className}`}>
      <strong className="font-semibold text-ink">Contenu illustratif.</strong> Ce récit sert à tester le prototype MUNDI. Il ne
      relate aucune actualité réelle ; ses sources sont des emplacements réservés et ses dates sont fictives.
    </div>
  );
}
