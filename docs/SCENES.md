# Scènes plein écran et transitions typographiques (ticket #30)

Couche technique pour la direction « l'information devient une scène » (ChatGPT, ticket #26 et PR #27 en brouillon).

| Rôle | Fichier |
| --- | --- |
| Registre des fonds, validation | `lib/scenes.ts` |
| Fonds approuvés | `content/scenes.json`, **vide aujourd'hui** |
| Contrôle au build | `lib/verified.ts` |
| Fond plein écran | `components/scene/SceneLayer.tsx` |
| Révélation du texte | `components/scene/RevealWords.tsx` |
| Bouton Pause | `components/scene/MotionToggle.tsx` |

## Principe : le fond décore, le texte informe

- Un **fond** est une image d'ambiance plein écran, placée derrière le texte d'une publication vérifiée ou d'une carte de données. Il est masqué aux lecteurs d'écran. Il ne contient **ni texte, ni chiffre, ni flèche causale**.
- Les chiffres, unités, dénominateurs, sources et dates restent en **texte HTML**, issus de `mundi-data-cards-v1`. Aucun chiffre n'est animé : pas de compteur qui défile.
- Sans fond, rien ne change : la publication garde son motif génératif et la carte de données son fond uni.
- Le slot `visual` de 14 rem (illustration complémentaire) est distinct de cette couche.

## Interrupteur : rien n'est public sans accord

Un fond n'apparaît que s'il est inscrit dans le **registre approuvé** `content/scenes.json`. Ce registre est vide (`[]`).

Si une publication ou une carte demande un fond absent du registre, **la construction du site échoue**. Un fond non approuvé ne peut donc pas être mis en ligne par erreur.

Pour mettre en ligne un fond, après le feu vert du fondateur :

1. Copier le fichier dans `public/media/scenes/<nom>.svg` (ou en `.webp` ou `.avif`).
2. Ajouter une entrée dans `content/scenes.json` :
   ```json
   { "id": "matiere", "src": "/media/scenes/matiere.svg", "credit": "Direction artistique MUNDI", "license": "Création originale MUNDI", "approvedBy": "Nom", "approvedAt": "AAAA-MM-JJ" }
   ```
3. Dans une publication (ou une carte de données), écrire `"scene": { "backdrop": "matiere", "focus": "haut" }`. Le cadrage `focus` vaut `haut`, `centre` (par défaut) ou `bas`.

Le crédit et la licence du fond sont toujours affichés sur la carte (« Fond : … »).

## Mouvement

- **Révélation des mots du titre**, décalés de 70 ms, puis fondu du texte. Elle ne se joue qu'à la première apparition d'un écran. Un écran déjà lu reste affiché quand on revient en arrière.
- **Léger zoom du fond** (18 s, aller-retour) et filet menthe, **seulement sur l'écran actif**.
- Le texte n'est masqué qu'une fois le fil interactif (JavaScript chargé). Sans JavaScript, tout est visible.
- **Mouvement réduit** (`prefers-reduced-motion`) : aucune animation, tout le texte est visible tout de suite, et le défilement est instantané.
- **Bouton « Mettre le décor en pause »** (règle WCAG 2.2.2), affiché sur chaque écran qui a un fond. Il arrête aussi le motif génératif. Le choix est retenu sur l'appareil.
- Le défilement vertical natif est conservé, avec un écran par geste. Au clavier : flèches haut et bas, Page précédente et Page suivante, j et k. Il n'y a jamais de défilement horizontal.

## Lisibilité

- Un voile sombre en haut et en bas de l'écran garde le texte lisible.
- Sur un fond, le ton ivoire d'une carte est ignoré : le texte reste clair sur nuit.
- axe-core ne mesure pas le contraste sur une image. **Chaque nouveau fond doit être vérifié à l'œil**, sur téléphone, avant approbation. Il doit rester sombre derrière le titre et derrière le bas de l'écran.

## Tests

`tests/e2e/scenes.spec.ts` (Chromium : Pixel 7 et ordinateur 1440×900, plus un écran de 320 px) vérifie :

- le site normal : registre vide, aucun fichier de fond publié ;
- le fond plein écran, le cadrage, le crédit, et le texte et les chiffres au-dessus du fond ;
- la révélation seulement sur l'écran actif, les espaces conservés entre les mots, et le titre lu comme une seule phrase ;
- le mouvement réduit ;
- le bouton Pause, retenu après rechargement ;
- le clavier ;
- l'absence de défilement horizontal à 320 px ;
- axe-core.

Le site de test utilise un registre **inventé** (`tests/fixtures/scenes.fixture.json`) et un **simple dégradé neutre** (`tests/fixtures/scenes/test-fond-neutre.svg`). Ces fichiers sont copiés uniquement dans `out-fixtures/`, jamais dans `public/`.

Les décors de la PR #27 ne sont **pas** dans ce dépôt. Les captures du prototype ont été faites en local avec ces fichiers, sans les committer.

## Limites

- Testé uniquement dans **Chromium**. Safari iOS (WebKit) n'est pas disponible dans l'environnement de test. Restent à vérifier sur un vrai iPhone : `100dvh`, le geste de défilement avec aimantation et la fluidité du zoom du fond.
- Pas de test sur un vrai téléphone Android.
