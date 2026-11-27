# Prévention durable (ticket #125) : où vit chaque contrôle

Le 26/11, un même passage de publication a mis en ligne deux articles sur l'amende des parfums
(communiqué IP/26/2574). Le même jour, une trentaine de photos hors sujet ont été publiées et
l'accueil a présenté la sélection de la veille comme celle du jour. Ce document dit, pour chaque
contrôle ajouté, dans quel fichier il se trouve et quelles voies de publication le traversent.
Tous ces contrôles sont déterministes. Ils n'appellent aucun modèle et aucune API payante.

## 1. Doublons : un seul contrôle pour toutes les voies

| Étape | Fichier | Ce qui est comparé |
| --- | --- | --- |
| Règle | `scripts/duplicate-guard.mjs` | Références normalisées (`IP/26/2574` = `ip_26_2574`, `AT.40826`, CELEX, ECLI, DOI). Adresses de sources canoniques : https, sans www, sans suivi, sans langue du portail de la Commission. Éléments du fait : entités, action (amende, rachat…), montants, date à trois jours près, type (actualité, concept, récit). |
| Avant publication | `scripts/autopublish-agents.mjs` (`blockers`) | Chaque brouillon contre le catalogue, publications retirées comprises, et contre les brouillons déjà retenus du même lot. |
| Écriture | `scripts/catalogue-insert.mjs` (`insertBatch`) | C'est le point d'insertion unique. Le catalogue est relu juste avant d'écrire. |
| Lots concurrents | `scripts/publish-to-main.sh` | Le lot est rejoué sur le main le plus récent à chaque tentative de push, avec jusqu'à quatre essais. Il n'y a plus de `git pull --rebase` sur le JSON. |
| Toute autre voie | `scripts/validate-editorial.mjs` | Aucun doublon manifeste n'est admis dans le catalogue publié. Ce contrôle couvre la CI qualité de chaque PR et chaque publication automatique. |

Verdicts :

- **Même décision et même fait** : l'article est mis « en attente » et rien n'est publié. Le journal propose d'enrichir l'article existant, avec les sources et les chiffres nouveaux.
- **Source commune, angle distinct** : l'article est publié avec « revue demandée ». C'est le cas d'un concept et d'une actualité qui citent le même communiqué.
- **Relance du même lot** : « déjà présent ». Rien n'est créé.
- **Entrée défectueuse** : elle est « bloquée » seule. Le reste du lot continue.

Chaque décision est journalisée dans `reports/insertion.json`, avec la raison et les identifiants
comparés (références, adresses, entités, actions, chiffres, similarité).

## 2. Photos : pertinence avant chaque rattachement

Toute la logique est dans `scripts/collect-editorial-images.mjs`. Elle s'applique à chaque collecte
horaire (`editorial-images.yml`) et à chaque remplacement automatique.

- **Sujet central** (`centralSubject`) : les noms propres du titre, les lieux du titre et du résumé, et l'époque (les années du titre).
- **Titre et description de la photo** (`subjectConflict`) : une époque différente de plus de deux ans, un lieu incompatible (un budget népalais pour la dette européenne) ou une photo déjà écartée par la rédaction est refusé.
- **Rubrique** (`queryPlan`) : seul un repère qui nomme un sujet précis est « fort », par exemple « Ariane 5 rocket » ou « Lehman Brothers headquarters ». Un repère de rubrique comme « laboratory », « workplace employees » ou « wind turbines » sert à chercher, jamais à publier seul. Exception : la photo est publiée si son titre nomme le sujet par deux de ses noms propres (« Amoco Cadiz anchor »).
- **Déclencheurs** (`matchesAtWordStart`, `AMBIGUOUS`) : un déclencheur doit commencer un mot. « vent » dans « souvent » et « mine » dans « détermine » ne comptent pas. Les mots à double sens (« franchise », « obligation » sans « d'État », « vent ») ne font jamais un repère fort.
- **En cas de doute ou de conflit** : l'article garde sa couverture typographique. La photo candidate part dans le rapport, statut `needs_human_review`, avec la raison.
- **Ce qui est gardé** : le crédit, la licence, le lien d'origine et le texte alternatif de chaque photo, et le type `archive` (photo d'époque d'un récit daté) ou `illustration`. Le crédit affiche « Photo d'archive » ou « Photo d'illustration ».
- **Protection** (`protectReviewed`) : un visuel « conservé » ou « approuvé » dans `content/editorial-image-reviews.json` n'est jamais remplacé ni retiré par un passage automatique.

## 3. Aujourd'hui : une sélection qui expire

- **Règle** (`lib/today.ts`, `resolveToday`) : la date est celle de Paris.
  - Une sélection du jour garde les choix de la rédaction.
  - Une sélection périmée suivie de nouveautés est remplacée par les plus récentes, une actualité en tête.
  - Sans nouveauté, l'accueil affiche « Dernière édition » avec la vraie date.
- **Site statique** : l'accueil et le fil comparent dans le navigateur la date de Paris à celle du build (`lib/use-edition-day.ts`). Passé minuit, « Aujourd'hui » devient « Dernière édition », datée, même sans nouveau déploiement.
- **Nouveau build** (`.github/workflows/edition-refresh.yml`) : il est demandé à 00 h 02 à Paris par le crochet Netlify (secret `NETLIFY_BUILD_HOOK`, à ajouter). Le workflow vérifie ensuite que le site servi porte la date du jour (`data-edition-today`).

## 4. Rapports

- **Par lot** (`scripts/batch-report.mjs`, résumé du workflow et `reports/lot.md`) : doublons bloqués et propositions, revues demandées, entrées bloquées, photos publiées ou protégées, couvertures typographiques, visuels en révision et date de la sélection.
- **Après déploiement** (`scripts/check-live-netlify.mjs`) : domaine principal, pages clés, cinq dernières publications, leurs photos et leurs MP3 (type de fichier vérifié) et date de l'édition servie. Chaque erreur nomme l'article et l'action à mener.
- **Preuve** : `node scripts/batch-report.mjs --replay tests/fixtures/lot-2026-11-26` rejoue les six passages du 26/11, puis les relance. Les tests correspondants sont dans `tests/replay-2026-11-26.test.mjs`.

## Voies de publication

| Voie | Contrôles traversés |
| --- | --- |
| Tâches Claude Max (`max-publish.yml`) | Les 4 étapes du point 1, puis le rapport du lot |
| Rédaction API (`agent-newsroom.yml`) | Les 4 étapes du point 1, puis le rapport du lot |
| Rattrapage du 23/11 (`recover-agents-2026-11-23.yml`, manuel) | Les 4 étapes du point 1 |
| Correction d'un article (`correct-article.yml`) | `validate-editorial.mjs` (ce n'est pas une insertion) |
| PR ou modification manuelle | `validate-editorial.mjs` et les tests dans la CI qualité |
| Boîte de réception éditoriale (`editorial-inbox.yml`) | Ne publie rien |
