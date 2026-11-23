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
