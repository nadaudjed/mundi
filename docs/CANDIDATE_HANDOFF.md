# MUNDI — Transfert des sujets candidats vers l'atelier

## But

À partir d'une veille RSS ou Atom, produire une fiche par sujet en conservant sa provenance, sans prétendre vérifier ses faits. **La fiche n'est pas un article MUNDI et ne peut pas être publiée directement.**

## Pour le fondateur

1. GitHub > Actions > **Editorial inbox — manual research export** > **Run workflow**.
2. Ouvrir l'exécution terminée, télécharger l'artifact `mundi-research-inbox` (archive ZIP).
3. Dans l'archive, trouver `editorial-inbox.html` (tableau de veille) et le dossier `candidates/`.
4. Ouvrir le site MUNDI dans la page **`/atelier/`**, puis « Choisir une fiche (.json) » et sélectionner l'un des fichiers `mundi-candidat-…json` (une fiche à la fois). Le titre provisoire, le sujet et la provenance sont préremplis, mais **les faits, le résumé, les trois idées et une deuxième source restent à rédiger et vérifier**.
5. Avant toute publication, ouvrir l'article d'origine, vérifier les informations, compléter avec une deuxième source lorsque nécessaire, rédiger une synthèse originale et obtenir une validation humaine explicite.

Si aucun titre n'est accessible, le dossier candidats reste vide. Les erreurs de flux sont visibles dans le rapport de veille.

## Format de la fiche : `mundi-candidate-v1`

```json
{
  "format": "mundi-candidate-v1",
  "reviewStatus": "candidate_unverified",
  "headline": "Titre de presse à vérifier",
  "source": {"label": "Eurostat", "url": "https://ec.europa.eu/eurostat/news/example"},
  "topicHint": "economie",
  "publishedAt": "2026-11-23T09:00:00.000Z",
  "licenseUrl": "https://ec.europa.eu/eurostat/help/copyright-notice"
}
```

`publishedAt` indique la date de la **source externe**, pas une date de publication MUNDI. Aucun statut `published`, aucune approbation fictive, ni texte intégral, ni visuel tiers n'est créé.

## Architecture

- Collecte : `scripts/collect-sources.mjs`
- Rapport privé : `scripts/render-editorial-report.mjs`
- Export des fiches : `scripts/export-candidates.mjs`
- Tests unitaires : `tests/editorial-candidates.test.mjs`
- Import dans MUNDI Studio : `/atelier/` (`components/EditorialStudio.tsx`, `lib/candidate.ts`, `docs/STUDIO.md`). Le fichier est lu localement et ne publie rien.

L'export reste local à une exécution GitHub Actions et les fichiers ne sont pas publiés sur Netlify.

## Rédaction et aperçu

Après import, lire la source d'origine, vérifier les conditions de réutilisation, trouver au moins une autre source pertinente et rédiger un texte original. Utiliser **Prévisualiser dans le fil** pour voir une carte explicitement marquée **« Brouillon — non publié »**, puis **Télécharger le brouillon JSON**. Remettre ce brouillon à l'équipe éditoriale pour une relecture humaine et une Pull Request contrôlée. Ni la fiche importée ni la prévisualisation ne sont publiées.
