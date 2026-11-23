"use client";

import { useState } from "react";
import { topics } from "@/lib/topics";
import type { TopicSlug } from "@/lib/types";

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

export function EditorialStudio() {
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [message, setMessage] = useState("");
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
      <form onSubmit={e => { e.preventDefault(); exportDraft(); }} className="mt-8 space-y-7 rounded-3xl bg-paper p-5 ring-1 ring-night/10 md:p-8">
        <Field label="Titre de la publication" value={draft.title} onChange={v => set("title", v)} placeholder="Le sujet que nous souhaitons expliquer" />
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
        {message && <p role="status" className="rounded-xl bg-ivory p-4 text-sm leading-relaxed text-night">{message}</p>}
        <button type="submit" className="rounded-full bg-night px-6 py-3 text-sm font-semibold text-ivory hover:bg-blue">Télécharger le brouillon JSON</button>
      </form>
      <div className="mt-8 rounded-2xl bg-ivory-2 p-6 text-sm leading-relaxed text-night">
        <strong>Étape suivante :</strong> donnez le fichier téléchargé à Claude Code et demandez une vérification des sources,
        la validation éditoriale, puis une Pull Request. Le bouton ci-dessus ne publie rien.
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const classes = "mt-2 block w-full rounded-xl border border-night/20 bg-white p-3 text-sm font-normal text-night outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";
  return <label className="block text-sm font-semibold text-night">{label}
    {multiline
      ? <textarea rows={5} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={classes} />
      : <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={classes} />}
  </label>;
}
