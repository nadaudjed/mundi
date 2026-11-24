# MUNDI — Guide d'exploitation du pilote des agents

## Démarrage

1. Conserver `ANTHROPIC_API_KEY` uniquement dans les **Repository secrets** de GitHub Actions ; ne jamais la copier ici ou dans des fichiers.
2. En l'absence de `MUNDI_AGENT_PROVIDER`, une clé Anthropic active sélectionne Claude pour les deux passes (rédaction et vérification) et le modèle `claude-sonnet-5-5` par défaut.
3. Le workflow **MUNDI — 24 agents quotidiens (12 actualités, 12 concepts)** s'exécute sur calendrier et peut être lancé manuellement dans l'onglet **Actions > Run workflow**.

## Lecture du résultat

- Ouvrir le résumé du job `newsroom` pour retrouver le fournisseur, le modèle, les prérequis manquants et les compteurs réels.
- `20 assignments` désigne les missions **préparées** et non 20 articles rédigés.
- `Drafts generated` indique les brouillons internes effectivement produits.
- `Machine-checked` indique les brouillons ayant franchi le contrôle IA ; **cela ne constitue pas une validation éditoriale humaine**.
- Télécharger l'artefact privé `mundi-agents-daily-newsroom` de l'exécution pour voir les erreurs, brouillons et rapports.
- `Published stories` reste à **0** : aucune publication automatique dans le pilote.

## Coûts et sécurité

- `MUNDI_AGENTS_PER_DAY` (défaut 24) et `MUNDI_AGENT_MAX_ATTEMPTS` (défaut 3 essais par agent) règlent le volume ; chaque relance manuelle du workflow est facturée en plus.
- Surveiller la facturation API Anthropic avant d'augmenter ce plafond et ne pas confondre accès à Claude et crédits d'API.
- En cas d'erreur ou de réponse incomplète, **ne jamais inventer de brouillons**, contourner la vérification ou remplacer silencieusement le fournisseur.
- Conserver les dossiers de recherche hors du contenu publié ; les sujets sensibles et les vérifications insuffisantes nécessitent une escalade humaine.

## Validation

Le passage à 24 agents par jour (24/11/2026) est suivi par le tableau de bord interne : erreurs, liens, coût estimé, agents sans brouillon publiable. Voir les issues #41 et #43.

## Diagnostic API HTTP

Le 23 novembre 2026, la clé Anthropic est bien détectée mais le premier essai a échoué avec deux réponses `HTTP 400` (sans article créé). La PR #49 a renforcé les messages d'erreur sans exposer les secrets. Les détails techniques limités à `error.type` et `error.message` peuvent maintenant être consultés dans les résultats privés du job pour diagnostiquer une requête invalide ou une restriction de recherche Web. Avant d'ajuster les paramètres, distinguer la configuration de l'appel de l'état de facturation et des permissions de l'API. Ne jamais afficher ni copier la clé dans les rapports.
