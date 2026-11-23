"use client";

import { useId, useState, type ChangeEvent } from "react";
import { parseCandidate, MAX_CANDIDATE_BYTES, type Candidate } from "@/lib/candidate";
import { formatDate } from "@/lib/format";
import { topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";
import { DraftPreview } from "./DraftPreview";

type Draft = {
  title: string; summary: string; topic: TopicSlug; keyPoints: string[];
  facts: string; analysis: string; hypothesis: string;
  source1Name: string; source1Url: string; source2Name: string; source2Url: string;
};
const INITIAL: Draft = {
  title: "", summary: "", topic: "geopolitique", keyPoints: ["", "", ""],
  facts: "", analysis: "", hypothesis: "",
  source1Name: "", source1Url: "", source2Name: "", source2Url: "",
};
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

type Stage = "candidat" | "brouillon";

export function EditorialStudio() {
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [message, setMessage] = useState("");
  const [candidate, setCandidate] = useState<(Candidate & { fileName: string }) | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [readOrigin, setReadOrigin] = useState(false);
  const [checkedRights, setCheckedRights] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileId = useId();

  const started = Boolean(draft.summary.trim() || draft.facts.trim() || draft.source2Name.trim() || draft.keyPoints.some((p) => p.trim()));
  const stage: Stage = candidate && !started ? "candidat" : "brouillon";
  const todo = [
    draft.title.trim().length < 12 && "Titre (12 caractères minimum), reformulé avec vos mots",
    draft.summary.trim().length < 30 && "Résumé original (30 caractères minimum)",
    draft.keyPoints.some((p) => p.trim().length < 12) && "Les trois idées essentielles",
    draft.facts.trim().length < 30 && "Les faits vérifiés, attribués aux sources",
    (!draft.source2Name.trim() || !draft.source2Url.trim()) && "Une deuxième source indépendante",
    candidate && !readOrigin && "Lire l'article d'origine",
    candidate && !checkedRights && "Vérifier les conditions de réutilisation de la source",
  ].filter((x): x is string => Boolean(x));

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage("");
    if (file.size > MAX_CANDIDATE_BYTES) {
      setImportErrors(["Fichier trop volumineux : 20 Ko maximum pour une fiche de veille."]);
      return;
    }
    const result = parseCandidate(await file.text());
    if (!result.ok) {
      setImportErrors(result.errors);
      return;
    }
    const c = result.candidate;
    setImportErrors([]);
    setCandidate({ ...c, fileName: file.name });
    setReadOrigin(false);
    setCheckedRights(false);
    setPreview(false);
    // Un nouveau sujet repart d’un formulaire vide : ne jamais mélanger ses faits
    // avec ceux d’un autre brouillon en cours de rédaction.
    setDraft({
      ...INITIAL,
      title: c.headline,
      topic: c.topic ?? INITIAL.topic,
      source1Name: c.source.label,
      source1Url: c.source.url,
    });
  }

  function removeCandidate() {
    setCandidate(null);
    setImportErrors([]);
    setReadOrigin(false);
    setCheckedRights(false);
  }
  const set = (name: keyof Draft, value: string) => setDraft(prev => ({ ...prev, [name]: value }));
  const point = (index: number, value: string) => setDraft(prev => ({
    ...prev, keyPoints: prev.keyPoints.map((p, i) => i === index ? value : p),
  }));

  function exportDraft() {
    const errors: string[] = [];
    if (draft.title.trim().length < 12) errors.push("Un titre de 12 caractères minimum est requis.");
    if (draft.summary.trim().length < 30) errors.push("Le résumé doit comporter au moins 30 caractères.");
    if (draft.keyPoints.some(p => p.trim().length < 12)) errors.push("Complétez les trois idées clés.");
    if (draft.facts.trim().length < 30) errors.push("Complétez les faits.");
    if (!draft.source1Name.trim() || !draft.source2Name.trim()) errors.push("Deux noms de sources sont requis.");
    if (candidate && !readOrigin) errors.push("Confirmez que vous avez lu l'article d'origine.");
    if (candidate && !checkedRights) errors.push("Confirmez que vous avez vérifié les conditions de réutilisation de la source.");
    if (draft.source2Url.trim() && draft.source2Url.trim() === draft.source1Url.trim()) errors.push("La deuxième source doit être différente de la première.");
    for (const address of [draft.source1Url, draft.source2Url]) {
      try { if (new URL(address).protocol !== "https:") errors.push("Utilisez des adresses HTTPS."); }
      catch { errors.push("Une adresse source est invalide."); }
    }
    if (errors.length) { setMessage(errors.join(" ")); return; }
    const today = new Date().toISOString().slice(0, 10);
    const data = {
      slug: slugify(draft.title), title: draft.title.trim(), summary: draft.summary.trim(),
      topic: draft.topic, publishedAt: today, updatedAt: today,
      status: "draft", reviewedBy: "",
      keyPoints: draft.keyPoints.map(p => p.trim()),
      sections: [
        { kind: "fait", heading: "Les faits", text: draft.facts.trim() },
        ...(draft.analysis.trim() ? [{ kind: "analyse", heading: "Pourquoi cela compte", text: draft.analysis.trim() }] : []),
        ...(draft.hypothesis.trim() ? [{ kind: "hypothese", heading: "Ce qui pourrait suivre", text: draft.hypothesis.trim() }] : []),
      ],
      sources: [
        { label: draft.source1Name.trim(), url: draft.source1Url.trim() },
        { label: draft.source2Name.trim(), url: draft.source2Url.trim() },
      ],
      // Provenance de la piste importée : utile à la relecture, n'autorise aucune publication.
      ...(candidate ? { origin: { format: "mundi-candidate-v1", reviewStatus: "candidate_unverified", sourceUrl: candidate.source.url, externalPublishedAt: candidate.externalPublishedAt, licenseUrl: candidate.licenseUrl } } : {}),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = (data.slug || "mundi-brouillon") + ".draft.json";
    link.click();
    URL.revokeObjectURL(objectUrl);
    setMessage("Brouillon téléchargé. Il n’est pas publié : demandez à Claude Code de le relire, vérifier et préparer une Pull Request.");
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-amber/40 bg-amber/10 p-5 text-sm leading-relaxed text-night">
        <strong>Atelier local, sans compte et sans publication directe.</strong> Ce formulaire fonctionne uniquement dans votre navigateur :
        chacun peut le consulter, mais personne ne peut publier sur MUNDI depuis cette page. Les informations saisies ne sont pas envoyées à un serveur.
        Ne saisissez pas de données confidentielles. Un brouillon téléchargé doit être vérifié avant toute publication.
      </div>
      <StatusSteps stage={stage} />

      <section aria-labelledby={`${fileId}-h`} className="mt-8 rounded-3xl bg-paper p-5 ring-1 ring-night/10 md:p-8">
        <h2 id={`${fileId}-h`} className="font-display text-xl font-semibold text-night">1. Importer une fiche de veille (facultatif)</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Fichier « mundi-candidat-….json » issu du rapport de veille. Seuls le titre provisoire, la rubrique suggérée et la source sont repris.
          Le fichier reste dans votre navigateur.
        </p>
        <label htmlFor={fileId} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-night/20 bg-white px-5 py-2.5 text-sm font-semibold text-night hover:border-night/50 focus-within:ring-2 focus-within:ring-mint">
          Choisir une fiche (.json)
          <input id={fileId} type="file" accept="application/json,.json" onChange={importFile} className="sr-only" data-testid="candidate-file" />
        </label>
        {importErrors.length > 0 && (
          <div role="alert" className="mt-4 rounded-xl border border-[#b3261e]/40 bg-[#fdecea] p-4 text-sm text-[#7a1712]" data-testid="import-errors">
            <p className="font-semibold">Cette fiche n&apos;a pas été importée :</p>
            <ul className="mt-1 list-disc pl-5">{importErrors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        {candidate && (
          <div className="mt-4 rounded-2xl border border-amber/50 bg-amber/10 p-4 text-sm text-night" data-testid="candidate-summary">
            <p className="font-semibold text-[#5c4210]">Piste importée : candidat non vérifié ({candidate.fileName})</p>
            <dl className="mt-2 grid gap-1 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">Média source</dt><dd>{candidate.source.label}</dd>
              <dt className="text-muted">Article d&apos;origine</dt>
              <dd><a href={candidate.source.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-blue-ink underline">{candidate.source.url}</a></dd>
              <dt className="text-muted">Date de la source</dt><dd>{candidate.externalPublishedAt ? formatDate(candidate.externalPublishedAt.slice(0, 10)) : "non indiquée"} <span className="text-muted">(date externe, pas une date MUNDI)</span></dd>
              <dt className="text-muted">Conditions</dt>
              <dd>{candidate.licenseUrl ? <a href={candidate.licenseUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-blue-ink underline">{candidate.licenseUrl}</a> : "non indiquées : à vérifier avant toute reprise"}</dd>
              <dt className="text-muted">Rubrique suggérée</dt><dd>{candidate.topic ? topics.find((t) => t.slug === candidate.topic)?.name : "aucune reconnue : à choisir"}</dd>
            </dl>
            {candidate.ignored.length > 0 && <p className="mt-2 text-xs text-muted">Champs ignorés : {candidate.ignored.join(", ")}.</p>}
            <div className="mt-3 space-y-2">
              <label className="flex items-start gap-2"><input type="checkbox" checked={readOrigin} onChange={(e) => setReadOrigin(e.target.checked)} className="mt-1" /> J&apos;ai ouvert et lu l&apos;article d&apos;origine.</label>
              <label className="flex items-start gap-2"><input type="checkbox" checked={checkedRights} onChange={(e) => setCheckedRights(e.target.checked)} className="mt-1" /> J&apos;ai vérifié les conditions de réutilisation de cette source.</label>
            </div>
            <button type="button" onClick={removeCandidate} className="mt-3 text-xs font-semibold text-muted underline">Retirer la fiche</button>
          </div>
        )}
      </section>

      <form onSubmit={e => { e.preventDefault(); exportDraft(); }} className="mt-8 space-y-7 rounded-3xl bg-paper p-5 ring-1 ring-night/10 md:p-8" aria-label="Brouillon">
        <h2 className="font-display text-xl font-semibold text-night">2. Rédiger le brouillon</h2>
        <Field label="Titre de la publication" value={draft.title} onChange={v => set("title", v)} placeholder="Le sujet que nous souhaitons expliquer"
          hint={candidate && draft.title === candidate.headline ? "Titre provisoire repris de la source : reformulez-le avec vos mots." : undefined} />
        <label className="block text-sm font-semibold text-night">Rubrique
          <select value={draft.topic} onChange={e => setDraft(prev => ({ ...prev, topic: e.target.value as TopicSlug }))} className="mt-2 block w-full rounded-xl border border-night/20 bg-white p-3">
            {topics.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </label>
        <Field label="Résumé" value={draft.summary} onChange={v => set("summary", v)} multiline placeholder="Ce qui se passe, pourquoi cela compte et ce que le lecteur doit comprendre." />
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-night">Les trois idées essentielles</legend>
          {draft.keyPoints.map((p, i) => <Field key={i} label={"Idée " + (i+1)} value={p} onChange={v => point(i,v)} />)}
        </fieldset>
        <Field label="Faits vérifiés" value={draft.facts} onChange={v => set("facts", v)} multiline placeholder="Décrivez les faits attribuables aux sources ; indiquez précisément les dates et les éléments vérifiables." />
        <Field label="Analyse (facultative)" value={draft.analysis} onChange={v => set("analysis", v)} multiline placeholder="Expliquez les causes, les mécanismes et le contexte." />
        <Field label="Hypothèses (facultatives)" value={draft.hypothesis} onChange={v => set("hypothesis", v)} multiline placeholder="Quelles évolutions pourraient avoir lieu ? Signalez explicitement les incertitudes." />
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-night">Références à vérifier (minimum deux)</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Source 1 — nom" value={draft.source1Name} onChange={v => set("source1Name", v)} />
            <Field label="Source 1 — lien HTTPS" value={draft.source1Url} onChange={v => set("source1Url", v)} placeholder="https://..." />
            <Field label="Source 2 — nom" value={draft.source2Name} onChange={v => set("source2Name", v)} />
            <Field label="Source 2 — lien HTTPS" value={draft.source2Url} onChange={v => set("source2Url", v)} placeholder="https://..." />
          </div>
        </fieldset>
        <div className="rounded-2xl bg-ivory p-4 text-sm text-night" data-testid="draft-todo">
          <p className="font-semibold">{todo.length === 0 ? "Le brouillon est complet. Il doit encore être vérifié et validé par une personne." : "Reste à rédiger ou vérifier :"}</p>
          {todo.length > 0 && <ul className="mt-1 list-disc pl-5">{todo.map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
        {message && <p role="status" className="rounded-xl bg-ivory p-4 text-sm leading-relaxed text-night">{message}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPreview((p) => !p)} aria-expanded={preview} aria-controls={`${fileId}-preview`} className="rounded-full border border-night/20 bg-white px-6 py-3 text-sm font-semibold text-night hover:border-night/50">
            {preview ? "Masquer la prévisualisation" : "Prévisualiser dans le fil"}
          </button>
          <button type="submit" className="rounded-full bg-night px-6 py-3 text-sm font-semibold text-ivory hover:bg-blue">Télécharger le brouillon JSON</button>
        </div>
      </form>
      <div id={`${fileId}-preview`} className={preview ? "mt-8" : "hidden"}>
        {preview && (
          <>
            <p className="mb-4 text-center text-sm text-muted">Aperçu local, visible seulement par vous. Ce brouillon n&apos;apparaît pas dans le fil public.</p>
            <DraftPreview
              data={{
                title: draft.title, summary: draft.summary, topic: draft.topic, keyPoints: draft.keyPoints,
                sources: [{ label: draft.source1Name, url: draft.source1Url }, { label: draft.source2Name, url: draft.source2Url }],
                externalPublishedAt: candidate?.externalPublishedAt,
              }}
            />
          </>
        )}
      </div>
      <div className="mt-8 rounded-2xl bg-ivory-2 p-6 text-sm leading-relaxed text-night">
        <strong>Étape suivante :</strong> donnez le fichier téléchargé à Claude Code et demandez une vérification des sources,
        la validation éditoriale, puis une Pull Request. Le bouton ci-dessus ne publie rien.
      </div>
    </div>
  );
}

/** Les trois états d'un sujet ; « Publié » n'est jamais atteignable depuis l'atelier. */
function StatusSteps({ stage }: { stage: Stage }) {
  const steps = [
    { id: "candidat", name: "Candidat non vérifié", text: "Piste de veille importée. Rien n'est vérifié." },
    { id: "brouillon", name: "Brouillon", text: "Texte rédigé dans l'atelier, encore non vérifié." },
    { id: "publie", name: "Publié après validation humaine", text: "Hors de l'atelier : relecture, validation explicite et Pull Request." },
  ];
  return (
    <ol className="mt-8 grid gap-3 md:grid-cols-3" aria-label="État du sujet" data-testid="status-steps" data-stage={stage}>
      {steps.map((s, i) => {
        const current = s.id === stage;
        return (
          <li key={s.id} aria-current={current ? "step" : undefined}
            className={`rounded-2xl p-4 text-sm ring-1 ${current ? "bg-night text-ivory ring-night" : s.id === "publie" ? "bg-paper text-muted ring-night/10 border-dashed" : "bg-paper text-night ring-night/10"}`}>
            <p className="text-xs font-bold uppercase tracking-wider">{i + 1}. {s.name}{current && " · étape actuelle"}</p>
            <p className={`mt-1 leading-relaxed ${current ? "text-ivory/85" : ""}`}>{s.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, hint }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; hint?: string;
}) {
  const classes = "mt-2 block w-full rounded-xl border border-night/20 bg-white p-3 text-sm font-normal text-night outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";
  return <label className="block text-sm font-semibold text-night">{label}
    {hint && <span className="mt-1 block text-xs font-medium text-[#7a5410]">{hint}</span>}
    {multiline
      ? <textarea rows={5} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={classes} />
      : <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={classes} />}
  </label>;
}
