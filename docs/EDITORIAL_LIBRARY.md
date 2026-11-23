# MUNDI — Bibliothèque éditoriale et stock continu

**Décision du fondateur (23 novembre 2026) : pas de lancement grand public avec une bibliothèque insuffisante.** La version Netlify actuelle est un site de démonstration/bêta, non une promesse de couverture éditoriale permanente.

## On ne confond jamais ces stocks

| État | Où le trouver | Comprend-il des faits approuvés ? | Public ? |
| --- | --- | --- | --- |
| **Idée evergreen** | `editorial/library/evergreen-ideas.json` | **Non** : question et angle de travail uniquement | Non |
| **Sujet candidat** | Branche `editorial-stock`, `editorial/library/candidates.json` | **Non** : titre, source, URL et date collectés automatiquement | Non |
| **Brouillon** | `editorial/reviews/*/draft.json` | Non, tant qu'une personne ne l'a pas approuvé | Non |
| **Réserve approuvée** | `editorial/library/approved-reserve.json` + dossier de validation | Oui, **après** revue humaine, sources et droits contrôlés | Non, jusqu'à publication |
| **Publication** | `content/publications.json` | Oui, revue humaine indiquée et tests techniques | Oui |

Les **120 idées** actuellement présentes ne sont donc **pas 120 articles**. Au point de départ : **1 article publié et 0 en réserve approuvée**. Les articles historiques peuvent nécessiter une actualisation, même s'ils ont été approuvés.

## Objectifs proposés avant lancement de masse

Le seuil exact pourra être ajusté au rythme effectivement soutenable, mais le tableau de bord prend les valeurs de départ suivantes :

- **120 récits réellement vérifiés et approuvés**, publiés + réserve ; viser environ 80 sujets pédagogiques durables et 40 analyses/actualités contextualisées.
- **30 récits approuvés en réserve**, soit **30 jours** à un rythme initial d'**un récit par jour**.
- **12 rubriques actives**, une couverture géographique et thématique équilibrée ; ne pas remplir artificiellement une rubrique à partir de sujets hors propos.
- **5 fournisseurs documentaires distincts** utilisés dans les publications, et **5 organismes indépendants autorisés** pour la veille automatisée.
- **7 publications réelles hebdomadaires**, mesurées sur les sept derniers jours ; adapter ces exigences si la cadence choisie change.
- Un suivi des nouvelles candidatures, des sources défaillantes, du stock approuvé et de la diversité thématique.

Le tableau de bord affiche **`launchReady: false`** tant que les conditions ne sont pas remplies. Ce compteur est un *indicateur*, **pas une autorisation de publication**.

## Où sont les 120 idées ?

Ouvrir `editorial/library/evergreen-ideas.json`. Il contient 10 pistes par rubrique, notamment comment fonctionnent un réseau électrique, les chaînes de valeur industrielles, les matériaux critiques, la géopolitique, les mécanismes financiers et les enjeux de développement en Afrique. Chaque fiche n'a **ni chiffres, ni fausse source, ni approbation**. La rédaction doit vérifier les faits, rechercher les sources appropriées et construire son propre article.

## Comment ne pas perdre la veille quotidienne ?

Le workflow GitHub **Editorial inbox — manual research export** continue sa collecte automatique quotidienne à 06 h 23 UTC et reste déclenchable manuellement. Les flux Eurostat approuvés gardent leur contrôle strict des licences et des domaines.

Une **seconde tâche à droits limités** intervient après la collecte réussie :

1. Elle récupère **les métadonnées** de l'archive GitHub Actions, pas de textes complets ni d'images.
2. Elle fusionne ces pistes par URL canonique, supprime les doublons et retient les pistes vues dans les **365 derniers jours**, dans la limite de **12 000 entrées**.
3. Elle enregistre l'index dans la branche séparée **`editorial-stock`** et **jamais sur `main`**. Cette branche n'alimente pas Netlify et ne rend aucune information publique.
4. Elle génère un **tableau de bord privé** : `mundi-editorial-library-dashboard` (HTML et JSON, archive GitHub Actions conservée 30 jours), indiquant vraies publications, réserve, idées, candidats et alertes.
5. Si tous les flux échouent, la collecte est signalée en échec. **L'archive déjà enregistrée reste intacte** ; elle n'est pas remplacée par une liste inventée.

L'archivage ne crée aucun texte éditorial, ne vérifie aucune information et n'effectue aucune publication. Aucune garantie de flux externe ininterrompu n'est possible : d'où la réserve de récits evergreen approuvés.

## Accès sans code

Dans [GitHub Actions](https://github.com/nadaudjed/mundi/actions/workflows/editorial-inbox.yml) : choisir la dernière collecte réussie, puis télécharger **`mundi-editorial-library-dashboard`**. Ouvrir `library-inventory.html` dans un navigateur. Chaque sujet candidat est identifié comme **NON VÉRIFIÉ**. Le tableau de bord n'a ni bouton « Publier » ni accès aux réglages du site.

Pour vérifier localement, utiliser `npm run test:library` et `npm run library:inventory`. `npm run library:archive` utilise `reports/editorial-inbox.json` et écrit un fichier local `reports/editorial-stock.json`, **sans écraser la branche de production**.

## Sources diversifiées : en préparation, jamais activées sans autorisation

`editorial/library/source-expansion.json` énumère vingt organismes potentiellement utiles (banques centrales, organisations africaines, énergie, environnement, minéraux, sciences). **Tous leurs nouveaux flux sont désactivés** et marqués `pending_permission_review`. Les URLs, politiques de droits et permissions doivent être contrôlées pour chaque fournisseur avant ajout à `content/sources.json` et au catalogue de domaines permis dans le collecteur. Deux flux Eurostat ne représentent qu'**un fournisseur** ; ce n'est pas une diversité suffisante.

## Suite éditoriale indispensable

1. Sélectionner les 20 premières idées **à partir de sources ouvertes** ; trouver au moins deux références lorsque le propos l'exige.
2. Produire de vrais textes originaux avec faits, analyses, limites et sources accessibles, sans images tierces non autorisées.
3. Faire relire par une personne responsable, enregistrer le statut d'approbation et la date ; approvisionner la **réserve privée** sans mettre les contenus en ligne.
4. Préparer les éditions planifiées, actualiser périodiquement les récits et publier seulement après le feu vert éditorial.
5. Mesurer la consommation et la fraîcheur du stock ; **ralentir la publication** plutôt que remplir le fil avec des contenus insuffisamment vérifiés si la réserve diminue.

**Important :** l'accumulation de sujets candidats n'est pas une preuve que MUNDI « ne manquera jamais » d'actualités. La robustesse repose sur **des sources diverses + une réserve approuvée + la mise à jour des contenus**.
