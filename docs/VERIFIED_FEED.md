# Publications vérifiées dans le fil immersif (ticket #17)

## Ce qui s'affiche

Le fil d'accueil est **unique** :

1. **Publications vérifiées** : uniquement les entrées valides de `content/publications.json` (`publishedArticles` de `lib/editorial.ts`), de la plus récente à la plus ancienne. Rien d'autre (aucun brouillon, aucun export de la file éditoriale).
2. **Écran de séparation** « La suite est illustrative » (seulement s'il existe au moins une publication).
3. **Démonstrations**, toujours marquées « Démonstration » / « Contenu illustratif ».
4. **Fin du fil**, avec le nombre de publications vérifiées.

Tant que `content/publications.json` est vide (c'est le cas aujourd'hui), le fil est exactement celui de la V5.

## Carte « publication vérifiée » (`components/VerifiedCard.tsx`)

- Badge **Vérifié**, sujet, titre, résumé.
- Dates de publication et d'actualisation (`<time>`), nom du relecteur.
- **Sources visibles et cliquables** (3 au maximum sur la carte, ouverture dans un nouvel onglet ; les autres via « + n autres » et la page complète).
- « Lire la publication » → `/actualites/<slug>/`, « Écouter », « Enregistrer », « Partager ».
- **Aucune photo ni vidéo** : fond éditorial original en deux variantes, en alternance :
  - `motif` : motif génératif du sujet qui dérive lentement (désactivé si l'appareil demande moins d'animations) ;
  - `sobre` : halo de couleur statique.
  Le fond est décoratif (`aria-hidden`) ; un crédit « Visuel : motif génératif MUNDI » est affiché.
- L'en-tête mobile affiche « Vérifié » sur ces cartes, « Démonstration » ailleurs.

Les enregistrements utilisent la clé `actualite:<slug>` (`lib/publication-links.ts`), distincte des démonstrations, et apparaissent dans « Enregistrés ».

## Où sont lues les publications

`lib/verified.ts`, côté serveur et au moment de la construction uniquement. Le fil, `/actualites/`, les pages de publication et « Enregistrés » passent tous par ce module.

## Tests avec des publications inventées

- Les publications inventées sont dans `tests/fixtures/publications.fixture.json`, et **seulement là**. Elles ne sont jamais copiées dans `content/`.
- `scripts/build-e2e-sites.mjs` construit d'abord un site de test (`out-fixtures/`, ignoré par Git) avec `MUNDI_TEST_PUBLICATIONS`, puis le site normal (`out/`).
- Garde-fous dans `lib/verified.ts` : la variable est refusée sur Netlify, chaque entrée passe la validation éditoriale, chaque slug commence par `test-` et chaque source utilise le domaine réservé `.test` (qui n'existe pas sur Internet).
- `tests/e2e/verified-feed.spec.ts` vérifie les deux cas : site normal sans publication (et sans aucune trace des données de test), site de test avec publications (ordre, séparation, sources, dates, crédits, lien, écoute, enregistrement, filtre, accessibilité axe).

## Publier une vraie publication

Rien ne change côté rédaction : une publication n'apparaît qu'après relecture humaine et ajout explicite dans `content/publications.json` (voir `docs/PUBLISHING.md`). Cette modification est exclue de la fusion automatique.
