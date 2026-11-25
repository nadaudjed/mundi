import Link from "next/link";
import { dossierOf, dossierPath } from "@/lib/dossiers";

/** Sur un article qui fait partie d'un dossier : un lien discret vers le dossier. */
export function DossierLink({ slug }: { slug: string }) {
  const d = dossierOf(slug);
  if (!d) return null;
  return (
    <p className="mt-6 border-l-2 border-accent py-1 pl-3 text-sm text-ink" data-testid="dossier-link">
      Ce sujet fait partie du dossier{" "}
      <Link href={dossierPath(d.id)} className="font-semibold text-accent underline underline-offset-4">« {d.shortTitle} »</Link>
      , avec sa chronologie, ses chiffres sourcés et ce qui a changé.
    </p>
  );
}
