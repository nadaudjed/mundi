# MUNDI — Guide d'exploitation du pilote des agents

## Démarrage

1. Conserver `ANTHROPIC_API_KEY` uniquement dans les **Repository secrets** de GitHub Actions ; ne jamais la copier ici ou dans des fichiers.
2. En l'absence de `MUNDI_AGENT_PROVIDER`, une clé Anthropic active sélectionne Claude pour les deux passes (rédaction et vérification) et le modèle `claude-sonnet-5-5` par défaut.
3. Le workflow **MUNDI — 20 missions quotidiennes des agents (révision privée)** s'exécute sur calendrier et peut être lancé manuellement dans l'onglet **Actions > Run workflow**.

## Lecture du résultat

- Ouvrir le résumé du job `newsroom` pour retrouver le fournisseur, le modèle, les prérequis manquants et les compteurs réels.
- `20 assignments` désigne les missions **préparées** et non 20 articles rédigés.
- `Drafts generated` indique les brouillons internes effectivement produits.
- `Machine-checked` indique les brouillons ayant franchi le contrôle IA ; **cela ne constitue pas une validation éditoriale humaine**.
- Télécharger l'artefact privé `mundi-agents-daily-newsroom` de l'exécution pour voir les erreurs, brouillons et rapports.
- `Published stories` reste à **0** : aucune publication automatique dans le pilote.

## Coûts et sécurité

- `MUNDI_AGENT_MAX_JOBS` est limité à **2 par exécution** en l'absence de configuration explicite ; plusieurs exécutions peuvent néanmoins être facturées le même jour.
- Surveiller la facturation API Anthropic avant d'augmenter ce plafond et ne pas confondre accès à Claude et crédits d'API.
- En cas d'erreur ou de réponse incomplète, **ne jamais inventer de brouillons**, contourner la vérification ou remplacer silencieusement le fournisseur.
- Conserver les dossiers de recherche hors du contenu publié ; les sujets sensibles et les vérifications insuffisantes nécessitent une escalade humaine.

## Validation

Le passage de 2 à 20 missions par jour nécessite un retour d'expérience sur les erreurs, sources accessibles, coût moyen, diversité des sujets et fiabilité des contrôles. Voir les issues #41 et #43.
