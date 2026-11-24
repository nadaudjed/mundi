/** Titre de page descriptif, suivi d'une phrase d'explication concrète. Pas de sur-titre. */
export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-rule pb-6">
      <h1 className="font-display text-titre font-semibold text-ink text-balance">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
