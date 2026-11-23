# MUNDI Studio : importer une piste de veille et préparer un brouillon (ticket #20)

Page : `/atelier/` (non indexée). Composants : `components/EditorialStudio.tsx`, `components/DraftPreview.tsx`. Lecture des fiches : `lib/candidate.ts`.

## Les trois états d'un sujet

| État | Où | Ce que cela veut dire |
| --- | --- | --- |
| **Candidat non vérifié** | Fiche `mundi-candidat-….json` importée | Une piste de veille. Rien n'est vérifié. |
| **Brouillon** | Rédigé dans l'atelier, téléchargé en `.draft.json` (`status: "draft"`) | Texte original, encore non vérifié. |
| **Publié après validation humaine** | `content/publications.json`, via une Pull Request approuvée | Seul état visible dans le fil public. Jamais atteignable depuis l'atelier. |

## Import d'une fiche (format `mundi-candidate-v1`, voir `docs/CANDIDATE_HANDOFF.md`)

- Préremplis : titre **provisoire** (signalé « à reformuler »), rubrique suggérée si elle existe, nom et adresse de la source.
- Affichés pour information : date de la source **externe** (pas une date MUNDI), page des conditions d'utilisation.
- **Jamais préremplis** : résumé, trois idées essentielles, faits, analyse, hypothèses, deuxième source.
- Avant de télécharger un brouillon issu d'une fiche, il faut cocher « J'ai ouvert et lu l'article d'origine » et « J'ai vérifié les conditions de réutilisation », et indiquer une deuxième source différente de la première.
- Le brouillon téléchargé contient un bloc `origin` (adresse, date externe, page de droits) pour faciliter la relecture. Il n'autorise aucune publication.

### Contrôles de sécurité

Fichier de 20 Ko au maximum, une seule fiche JSON, format et statut `candidate_unverified` obligatoires (tout autre statut est refusé), adresses en HTTPS uniquement (ni `javascript:`, ni `http:`, ni identifiants, ni hôte local ou adresse IP), caractères de contrôle et d'inversion de texte refusés, champs inconnus ignorés et signalés. Tout est affiché comme du texte : un titre contenant du HTML n'est jamais interprété.

## Prévisualisation

« Prévisualiser dans le fil » montre le brouillon dans l'apparence d'une carte MUNDI, avec le bandeau **Brouillon — non publié** et la mention « Non vérifié » (jamais « Vérifié »). Les éléments manquants apparaissent comme « [… à rédiger] ».

## Ce que l'atelier ne fait pas

Pas de compte, pas de serveur, pas d'écriture dans le dépôt : tout reste dans le navigateur, et rien n'est conservé après fermeture de la page. Un brouillon n'apparaît jamais dans le fil public.

## Tests

`tests/e2e/studio.spec.ts` (mobile et ordinateur) avec des fiches inventées (`tests/fixtures/candidates/`) : préremplissage limité, étapes, téléchargement et contrôles, dix cas de fiches refusées, titre contenant du HTML, prévisualisation, absence du brouillon dans le fil, accessibilité axe.

## Cartes de données (ticket #25)

Section « 3. Cartes de données » : importer un fichier `mundi-data-cards-v1`. La structure est vérifiée (unités, dénominateurs, sources HTTPS, échelle commune justifiée) et les erreurs s'affichent en français. Chaque carte est prévisualisée avec « Brouillon — non publié » et un cadre d'emplacement pour le visuel. Les cartes sont ajoutées au `.draft.json` téléchargé (champ `dataCards`). Rien n'est publié. Voir `docs/DATA_CARDS.md`.
