import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="#246BCE" strokeWidth="2.4" />
      <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="#20B99A" strokeWidth="2.2" />
      <path d="M3.5 16h25" stroke="#246BCE" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="23.5" cy="8.5" r="2.6" fill="#20B99A" />
    </svg>
  );
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-semibold tracking-[0.22em] ${tone === "light" ? "text-ivory" : "text-night"}`}
      aria-label="MUNDI, retour au fil"
    >
      <LogoMark />
      <span className="text-[1.05rem]">MUNDI</span>
    </Link>
  );
}
