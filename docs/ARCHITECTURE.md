# Architecture du MVP

## Pile technique
- **Next.js (App Router) + TypeScript + Tailwind CSS v4**, conformément à `PROJECT_CONTEXT.md`.
- **Export statique** (`output: "export"`) : pas de serveur, pas de base de données, pas d'identifiants. Hébergement Netlify direct.
- **Polices auto-hébergées** via `@fontsource` (DM Sans pour le texte, Fraunces pour les titres) : pas d'appel à un service externe.

## Organisation
```
app/                 pages (fil, récit, explorer, enregistrés, à propos)
components/          composants d'interface (Feed, StoryTile, StoryVisual, navigation…)
lib/types.ts         modèle de contenu (Story, Topic, Format, sections typées)
lib/topics.ts        les 12 sujets éditoriaux et les 4 formats
lib/publication-kind.ts  genre d'une publication : actualité ou concept
lib/search.ts        recherche plein texte côté navigateur
lib/bookmarks.ts     enregistrements en localStorage
```

## Choix éditoriaux traduits dans le code
- Chaque section d'un récit a un type obligatoire : `fait`, `analyse` ou `hypothese`, affiché par une étiquette de couleur.
- Chaque récit porte `isDemo: true`, des dates de publication et de mise à jour, une liste d'incertitudes et des sources.
- Les sources de démonstration sont des **emplacements réservés** décrivant le type de référence attendu, sans lien ni imitation de vraie référence.
- Les visuels sont **génératifs** (SVG abstraits par sujet) : aucune image externe, donc aucune question de droits.
- Le format « En chiffres » affiche toujours l'unité, la période et l'origine des données.

## Accessibilité
Lien d'évitement, navigation au clavier dans le fil, `aria-pressed` sur les boutons bascule, contrastes élevés, focus visible, respect de `prefers-reduced-motion`.

## Étapes suivantes possibles
Remplacer les fixtures par un CMS éditorial avec relecture humaine, ajouter les médias (vidéo, voix off, sous-titres), l'internationalisation et des mesures d'audience respectueuses.

## Médias immersifs et tests de bout en bout (ticket #5)
- Médias du fil : `components/MediaStage.tsx`, `VideoCard.tsx`, `ImageStory.tsx`, `MediaCredit.tsx` ; bibliothèque et droits dans `lib/media.ts`. Détails : `docs/MEDIA.md`.
- Récits découpés en écrans (accroche, fait, explication) : `lib/narratives.ts`.
- Tests Playwright : `tests/e2e/`, configuration `playwright.config.ts`, commande `npm run test:e2e` (mobile Pixel 7 et ordinateur 1440×900).

## Mobile, PWA et médias accessibles (ticket #13)
- PWA : `app/manifest.ts`, `public/sw.js`, `components/PwaSetup.tsx`, `lib/install.ts`, `components/InstallButton.tsx`, pages `/application/` et `/hors-ligne/`. Pas de lecture hors ligne des récits.
- Réseau : `lib/network.ts` (économie de données). Erreurs de médias gérées dans `VideoCard.tsx` et `ImageStory.tsx`.
- Fin du fil : écran de transition entre les récits illustratifs et les futures publications vérifiées (`TransitionCard` dans `components/Feed.tsx`). Il compte les publications vérifiées sans en publier aucune.
- Tests : `tests/e2e/pwa.spec.ts`, `mobile-network.spec.ts`, `a11y.spec.ts` (axe-core). Détails et limites : `docs/MOBILE_QA.md`.

## Fil unique : publications vérifiées et démonstrations (ticket #17)
- Lecture des publications : `lib/verified.ts` (serveur, au moment de la construction). Carte : `components/VerifiedCard.tsx`. Fil : `components/Feed.tsx` reçoit les publications depuis `app/page.tsx`.
- Tests avec publications inventées (jamais déployées) : `tests/fixtures/`, `scripts/build-e2e-sites.mjs`, `tests/e2e/verified-feed.spec.ts`. Détails : `docs/VERIFIED_FEED.md`.

## MUNDI Studio (ticket #20)
- Import des fiches `mundi-candidate-v1` : `lib/candidate.ts` ; atelier : `components/EditorialStudio.tsx` ; aperçu : `components/DraftPreview.tsx` ; fond éditorial partagé : `components/EditorialBackdrop.tsx`. Détails : `docs/STUDIO.md`.


## Cartes de données (ticket #25)

Schéma typé `mundi-data-cards-v1` (`lib/data-cards.ts`), composant `components/data-cards/DataCardView.tsx`, cartes insérées dans le fil après leur publication approuvée, aperçu « Brouillon — non publié » dans l'atelier. La direction artistique (ticket #26) fournit les visuels et choisit parmi des paramètres de style limités aux jetons de la marque. Détails : `docs/DATA_CARDS.md`.

## Scènes plein écran (ticket #30)

Fonds d'ambiance plein écran derrière les publications vérifiées et les cartes de données, limités à un registre approuvé (`content/scenes.json`, vide tant que le fondateur n'a rien validé). Révélation typographique sur l'écran actif, bouton Pause, mouvement réduit respecté. Détails : `docs/SCENES.md`.
