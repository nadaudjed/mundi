import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
      <p className="font-display text-6xl font-semibold text-accent">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Cette page n&apos;existe pas</h1>
      <p className="mt-2 text-muted">Le lien est peut-être incorrect, ou le récit a été retiré.</p>
      <Link href="/" className="mt-6 btn btn-primary">
        Retour au fil
      </Link>
    </div>
  );
}
