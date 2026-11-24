import Link from "next/link";

/** Marque MUNDI : globe monochrome (couleur du texte), point d'accent rouge brique. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 16h25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="23.5" cy="8.5" r="2.6" fill="var(--accent, #A33B25)" />
    </svg>
  );
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-semibold tracking-[0.2em] ${tone === "light" ? "text-ivory" : "text-ink"}`}
      aria-label="MUNDI, retour au fil"
    >
      <LogoMark className="size-6" />
      <span className="text-[1rem]">MUNDI</span>
    </Link>
  );
}
