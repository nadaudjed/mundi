export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="animate-rise">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-ink">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl leading-tight font-semibold text-night text-balance md:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
