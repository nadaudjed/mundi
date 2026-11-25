"use client";

import Link from "next/link";
import { useState } from "react";
import type { Decryptage } from "@/lib/decryptage";

/**
 * Une question, puis la réponse expliquée après un appui. La même carte revient
 * dans « Réviser » (lib/flashcards.ts), avec la progression gardée sur l'appareil.
 */
export function QuizCard({ quiz }: { quiz: Decryptage["quiz"] }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="quiz-titre" className="mt-10 border border-rule-strong bg-surface p-5 md:p-6" data-testid="quiz">
      <p className="text-meta font-semibold text-accent">Testez-vous</p>
      <h3 id="quiz-titre" className="font-serif mt-1 text-[1.45rem] leading-tight text-ink">{quiz.question}</h3>
      {open ? (
        <div className="mt-3" data-testid="quiz-answer">
          <p className="font-semibold text-ink">{quiz.answer}</p>
          <p className="mt-1 leading-relaxed text-ink/85">{quiz.explanation}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!open && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} aria-expanded={open}>
            Voir la réponse
          </button>
        )}
        <Link href="/reviser/" className="btn btn-secondary">Retrouver dans Réviser</Link>
      </div>
    </section>
  );
}
