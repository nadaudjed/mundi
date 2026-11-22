export function DemoBadge({ tone = "dark", label = "Démonstration" }: { tone?: "dark" | "light"; label?: string }) {
  const styles =
    tone === "light"
      ? "border-amber/60 bg-amber/15 text-[#ffd98f]"
      : "border-amber/50 bg-amber/15 text-[#7a5410]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${styles}`}
    >
      <span className="size-1.5 rounded-full bg-amber" aria-hidden="true" />
      {label}
    </span>
  );
}

export function DemoNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm leading-relaxed text-[#5c4210] ${className}`}
    >
      <strong className="font-semibold">Contenu illustratif.</strong> Ce récit sert à tester le prototype MUNDI. Il ne
      relate aucune actualité réelle ; ses sources sont des emplacements réservés et ses dates sont fictives.
    </div>
  );
}
