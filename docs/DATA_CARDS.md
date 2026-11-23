# Cartes de données : intégration technique (ticket #25)

Ce document décrit le **contrat technique** entre le contenu (chiffres approuvés), la direction artistique (ChatGPT, ticket #26) et le code (Claude Code).

- Schéma et validation : `lib/data-cards.ts` (format `mundi-data-cards-v1`).
- Affichage : `components/data-cards/DataCardView.tsx`.
- Atelier : `components/data-cards/DataCardsImport.tsx`, dans `/atelier/`.
- Fil : `components/Feed.tsx` ; contrôle au build : `lib/verified.ts`.

## Principe

Les composants **ne calculent et n'inventent aucun chiffre**. Ils affichent tel quel ce qui est décrit dans les données, avec l'unité, le périmètre, la période, le dénominateur éventuel, la source et la date. Le seul calcul est la longueur des barres d'une « échelle commune », proportionnelle aux valeurs fournies (la plus grande valeur = 100 %).

Le code ne produit **aucun graphisme de remplacement** : sans visuel fourni, la carte n'affiche que du texte structuré. Dans l'atelier seulement, un cadre pointillé indique où ira le visuel.

## Où apparaissent les cartes

| Endroit | Condition | Marquage |
| --- | --- | --- |
| Fil public | La publication est dans `content/publications.json` (approuvée) et contient `dataCards` | Badge « Vérifié » dans l'en-tête du fil, lien « Comprendre » sur la dernière carte |
| MUNDI Studio (`/atelier/`) | Fichier importé localement | « Brouillon — non publié » sur chaque carte, jamais « Vérifié » |

Dans le fil, les cartes se placent juste **après** la carte de leur publication, chacune sur un écran vertical (« Données · carte 2 sur 4 »).

Une publication approuvée dont les cartes sont mal formées **fait échouer la construction du site**. Un build rouge vaut mieux qu'un chiffre sans unité ni source.

## Schéma (`mundi-data-cards-v1`)

Fichier pour l'atelier : `{ "format": "mundi-data-cards-v1", "cards": [ … ] }`. Dans une publication, le champ s'écrit `"dataCards": [ … ]`.

Une séquence contient 2 à 4 cartes. Champs communs à chaque carte :

| Champ | Obligatoire | Rôle |
| --- | --- | --- |
| `id` | oui | minuscules, chiffres, tirets ; unique dans la séquence |
| `kind` | oui | `stat`, `comparaison` ou `explication` |
| `headline` | oui | accroche, 140 caractères maximum |
| `source` | oui | `{ "label", "url" }`, adresse HTTPS |
| `asOf` | oui | date de la donnée, `AAAA-MM-JJ` |
| `note` | non | note méthodologique (« À savoir : … ») |
| `visual` | non | visuel fourni par la direction artistique (voir plus bas) |
| `style` | non | paramètres de style (voir plus bas) |

Une **mesure** (`Measure`) décrit toujours :

- `value` : un nombre ;
- `unit` : l'unité ;
- `label` : ce que la valeur mesure ;
- `scope` : le périmètre ;
- `period` : la période ;
- `denominator` : obligatoire si l'unité est un pourcentage, un taux, une part ou un ratio ;
- `decimals` : nombre de décimales affichées, de 0 à 3 (facultatif).

Les trois types de cartes :

- **`stat`** : `measure` et un `context` facultatif.
- **`comparaison`** : `items`, de 2 à 4 mesures, et `presentation` :
  - `echelle-commune` : barres proportionnelles. Autorisée seulement si toutes les valeurs ont **la même unité et le même dénominateur**, et aucune n'est négative.
  - `valeurs-distinctes` : valeurs côte à côte, sans barre, avec l'avertissement « Ces valeurs n'ont pas le même dénominateur… ». Exemple : un taux « des déchets collectés » et un taux « des déchets produits » ne se comparent pas sur une même échelle.
- **`explication`** : `steps`, de 2 à 5 étapes `{ label, text, nature }`, où `nature` vaut `fait` ou `hypothese`. Chaque étape affiche un badge « Fait » ou « Hypothèse ». Le champ `layout` choisit la présentation :
  - `sequence` (par défaut) : étapes numérotées, qui se suivent dans l'ordre.
  - `alternatives` : la première étape est le point de départ, les suivantes sont des issues possibles, sans numéro ni ordre (« Ensuite, selon les cas : »). Il faut au moins 3 étapes. C'est la présentation d'une bifurcation, par exemple « collecte et tri » qui mène au réemploi **ou** au recyclage. Une liste numérotée suggérerait à tort « réemploi puis recyclage ».

Pour une comparaison de deux flux (par exemple des déchets générés et des déchets traités la même année), une échelle commune reste possible s'ils ont la même unité. La `note` doit alors préciser qu'il s'agit de deux flux statistiques annuels distincts, et non du suivi d'un même lot. Un pourcentage reste associé à son propre dénominateur (`denominator`).

La validation vérifie la **structure**, pas l'exactitude des chiffres : une personne doit valider ces derniers.

## Paramètres de style (pour reproduire les maquettes de ChatGPT)

`style` est limité aux jetons de la marque, pour garantir des contrastes testés :

- `tone` : `night` (fond sombre, par défaut) ou `ivory` (fond clair).
- `accent` : `mint` (par défaut), `blue`, `amber` ou `topic` (la couleur du sujet de la publication).
- `emphasis` : `display` (chiffres et titres en Fraunces, par défaut) ou `sans` (DM Sans).

Si une maquette demande un réglage absent de cette liste, ChatGPT le signale dans le ticket #26 et Claude Code l'ajoute au schéma. Le code ne contient pas de styles libres (couleurs ou CSS arbitraires).

## Visuels fournis par la direction artistique

```json
"visual": {
  "kind": "svg",
  "src": "/media/visuels/<publication>/<fichier>.svg",
  "alt": "Description du visuel pour les lecteurs d'écran",
  "credit": "Direction artistique MUNDI",
  "license": "Création originale MUNDI",
  "approvedBy": "Nom de la personne qui a validé"
}
```

- Les fichiers sont déposés dans le dépôt, sous `public/media/visuels/`, et servis depuis `/media/visuels/…`. **Aucun lien vers un site tiers.**
- Formats acceptés : SVG, PNG, JPEG, WebP ou AVIF. Illustrations originales ou autorisées uniquement : pas de photos de presse sans licence.
- `decorative: true` (avec `alt: ""`) masque le visuel aux lecteurs d'écran quand il n'apporte aucune information. Une infographie qui porte des chiffres n'est **pas** décorative : ces chiffres doivent aussi figurer en texte dans la carte.
- Le crédit et la licence s'affichent sous le visuel (« Visuel : crédit · licence »).
- **Le slot `visual` sert à une illustration complémentaire, cadrée, sans chiffre indispensable.** On n'y insère pas une affiche 9:16 complète : sa typographie deviendrait illisible à cette taille. Les maquettes complètes (PR #27, ticket #26) servent de *références de composition*. Les grands chiffres, les barres, les étapes et les légendes sont rendus en HTML natif à partir des données typées, donc lisibles, traduisibles et accessibles.
- Le visuel occupe au plus 14 rem de haut et garde ses proportions (`object-contain`). Prévoir un cadrage vertical, lisible sur un écran de 360 px de large.
- Un SVG animé doit respecter `prefers-reduced-motion`.

## Fond plein écran (ticket #30)

Une carte peut demander `"scene": { "backdrop": "<id>", "focus": "haut" }`, un fond choisi dans le registre approuvé. Le ton nuit est alors imposé. Voir `docs/SCENES.md`.

## Animations et accessibilité

- Le chiffre clé apparaît en fondu (`animate-rise`) et les barres se remplissent (`animate-grow-x`), **seulement sur la carte visible** et seulement si l'appareil autorise les animations. En mouvement réduit, tout est affiché immédiatement, à sa taille finale.
- Chaque carte est un groupe nommé par son accroche. Chaque valeur a une phrase complète réservée aux lecteurs d'écran (« Quantité … : 1 234,5 unités, périmètre, période. »). La mise en forme visuelle, elle, leur est masquée pour éviter une lecture en double.
- Nombres au format français (`1 234,5`). Liens de source ouverts dans un nouvel onglet, signalé aux lecteurs d'écran.
- Contrastes vérifiés avec axe-core sur fond sombre et fond clair.

## Tests

`tests/e2e/data-cards.spec.ts` (Chromium : profils Pixel 7 et ordinateur 1440×900) couvre :

- l'absence de cartes sur le site normal ;
- sur le site de test : l'ordre et les positions, le format des nombres, les unités, dénominateurs, périmètres, périodes, sources et notes ;
- les barres seulement en échelle commune, et l'avertissement sinon ;
- le lien « Comprendre » ;
- les animations et le mouvement réduit ;
- axe-core ;
- l'absence de défilement horizontal ;
- dans l'atelier : l'import valide ou refusé, le marquage brouillon et l'export dans le `.draft.json`.

Les données utilisées sont **inventées** : `tests/fixtures/publications.fixture.json` et `tests/fixtures/data-cards/valide.json`, avec des sources sur le domaine réservé `.test`.

## Limites

- Testé seulement dans **Chromium** (émulation Pixel 7 et ordinateur). Pas sur un vrai iPhone (Safari iOS), un vrai téléphone Android ni Firefox. Voir `docs/MOBILE_QA.md`.
- Aucune vraie publication n'a encore de cartes. Le pilote `editorial/reviews/textile-2024/` est interne et non approuvé : aucun de ses chiffres n'est utilisé.
- Les visuels de la direction artistique ne sont pas encore livrés (ticket #26). L'emplacement est prêt et testé avec des cartes sans visuel.
