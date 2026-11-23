# MUNDI

**MUNDI — Comprendre le monde.** Prototype web (MVP) d'un média numérique indépendant, mobile d'abord, construit autour d'un fil de découverte vertical.

> ⚠️ Tous les récits de ce prototype sont des **contenus illustratifs**. Ils ne relatent aucune actualité réelle, leurs sources sont des emplacements réservés et leurs dates sont fictives.

Documents de référence : [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`AGENTS.md`](AGENTS.md), [`docs/EDITORIAL_GUIDELINES.md`](docs/EDITORIAL_GUIDELINES.md). Choix techniques : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Ce que contient le MVP

| Page | Adresse | Rôle |
| --- | --- | --- |
| Fil | `/` | Fil vertical plein écran (glisser / défiler / flèches du clavier), filtre par sujet, enregistrer, partager |
| Récit | `/recit/<slug>/` | Page de fond : l'essentiel, faits / analyse / hypothèses, points de vue, incertitudes, sources, dates |
| Explorer | `/explorer/` | 12 sujets et recherche plein texte (sans accents ni majuscules) |
| Enregistrés | `/enregistres/` | Récits enregistrés, conservés dans le navigateur (localStorage) |
| À propos | `/a-propos/` | Mission, méthode, formats et engagements éditoriaux |

## Lancer le site en local

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:3000, rechargement automatique
```

Autres commandes :

```bash
npm run build      # génère le site statique dans out/
npm start          # sert le dossier out/ (après build)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run test:e2e   # tests Playwright mobile + ordinateur (construit le site normal et un site de test avec publications inventées)
npm run media:generate  # régénère les médias de démonstration (nécessite ffmpeg)
npm run icons:generate  # régénère les icônes de l'application installable
```

## Application installable

MUNDI peut être ajouté à l'écran d'accueil d'un téléphone (page « Installer l'application »). Ce n'est pas un mode hors ligne : une connexion reste nécessaire. Vérifications et limites (Safari iOS, Android) : `docs/MOBILE_QA.md`.

## Déploiement

Le site est exporté en fichiers statiques (`out/`). `netlify.toml` indique à Netlify la commande de build et le dossier à publier. Aucune variable d'environnement ni secret n'est nécessaire. Toute mise en production reste soumise à l'accord du fondateur.

## Personnalisation du fil (branche en développement)

La page `/mes-sujets/` permet de choisir des thèmes préférés. Le fil « Pour vous » favorise ces thèmes, en réservant régulièrement une place à la découverte. Les choix restent dans le navigateur (localStorage), sans compte et sans suivi serveur.

## Révisions espacées

La page `/reviser/` propose des cartes mémoire à partir des trois idées essentielles de chaque récit. L'utilisateur essaie de les restituer puis s'auto-évalue ; les cartes retenues reviennent après 1, 3, 7, 14 puis 30 jours. Progression locale, aucune inscription requise. Le prototype utilise uniquement les récits illustratifs.

## Écoute du fil

Le bouton « Écouter » déclenche, après action explicite de l'utilisateur, une lecture en français du titre, résumé et trois idées principales via la synthèse vocale disponible sur son appareil. Cette voix est une fonctionnalité expérimentale du navigateur, pas une voix off enregistrée ; elle varie selon le système et peut être indisponible. L'écoute est arrêtée lorsque l'utilisateur quitte la carte active.

## Publications vérifiées et atelier éditorial

La page `/actualites/` présente uniquement les publications validées contenues dans `content/publications.json`, initialement vide. Les pages de démonstration restent séparées. `/atelier/` permet de préparer puis télécharger un brouillon JSON localement, sans publier ni accéder à GitHub. La validation humaine, les sources vérifiées et une Pull Request sont obligatoires avant publication. Documentation : `docs/PUBLISHING.md`. Vérification technique : `npm run validate:editorial`.

## Agents IA : activation de Claude (recherche privée)

Ajoute uniquement `ANTHROPIC_API_KEY` dans **Settings → Secrets and variables → Actions → Repository secrets**. Si aucun fournisseur n'est explicitement sélectionné, le moteur choisit Claude pour la rédaction **et** pour la seconde vérification, avec le modèle `claude-sonnet-5-5`. C'est un choix par défaut, pas un basculement automatique en cas d'erreur API. Pour remplacer ce modèle, configure la variable `MUNDI_AGENT_MODEL`. Pour imposer un fournisseur, renseigne `MUNDI_AGENT_PROVIDER` (`anthropic` ou `openai`).

Pour une vérification par un fournisseur différent, configure **ensemble** `MUNDI_CHECKER_PROVIDER`, `MUNDI_CHECKER_MODEL` et le secret de ce fournisseur. Un fournisseur différent sans identifiants ou modèle valide ne passe pas silencieusement sur Claude.

Le plafond de test par exécution est `MUNDI_AGENT_MAX_JOBS=2` par défaut. **Ce n'est pas un plafond de dépense par jour** : plusieurs déclenchements GitHub Actions peuvent lancer plusieurs traitements facturés. Surveille la consommation dans la console Anthropic et n'augmente pas à 20 sans mesure des coûts. Les frais d'API sont indépendants des abonnements de conversation Claude.

Chaque exécution des agents affiche les missions, brouillons, contrôles et éventuelles configurations manquantes dans son résumé GitHub Actions. Les brouillons restent dans les artefacts privés ; **aucun article n'est publié automatiquement**.

## Pilote d'approvisionnement (23–24 novembre 2026)

Le workflow `agent-newsroom.yml` planifie 20 missions, tente par défaut jusqu'à **12 recherches/rédactions** par exécution et peut publier **au plus 5 articles IA sur la journée**, uniquement après contrôles ; tous ces nombres sont des maxima et non une garantie de contenus fiables. La clé API Anthropic est facturée séparément. Les variables GitHub `MUNDI_AGENT_MAX_JOBS`, `MUNDI_AUTOPUBLISH_MAX` et l'interrupteur `MUNDI_AUTOPUBLISH=off` sont les commandes opérationnelles. La publication automatique peut être suspendue si les sources sont insuffisantes ou si des erreurs sont constatées. Les droits des médias, les audits humains et la diversification des sources restent requis pour un vrai lancement.
