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
```

## Déploiement

Le site est exporté en fichiers statiques (`out/`). `netlify.toml` indique à Netlify la commande de build et le dossier à publier. Aucune variable d'environnement ni secret n'est nécessaire. Toute mise en production reste soumise à l'accord du fondateur.
