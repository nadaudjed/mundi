# MUNDI — Veille RSS

Ce système récupère uniquement les **titres, URLs, éditeurs et dates** des flux RSS. Les éléments sont des **candidats non vérifiés**, jamais des articles MUNDI publiés.

Commande locale : `npm run sources:collect`. Le fichier de sortie est `reports/editorial-inbox.json` (non publié par Netlify, à conserver hors de Git).

Sources initiales à vérifier régulièrement : Le Monde international, Le Monde économie et RFI monde, dans `content/sources.json`. Respecter leurs conditions d'utilisation et leurs limites d'accès.

**Processus :** collecte → sélection → lecture des articles originaux → vérification indépendante si nécessaire → rédaction originale dans MUNDI Studio → validation humaine explicite → PR éditoriale → publication.

Sécurité : seules les URL HTTPS de domaines autorisés sont téléchargées. Limites : 12 secondes et 2 Mo par flux, 30 items par source. Pas de copie d'articles complets ni de médias tiers. Les erreurs de réseau n'entraînent jamais la création d'une information fictive.

Tests : `npm run test:sources`. La collecte doit être lancée manuellement pour le moment. Pas d'actualisation automatique du site.

## Tableau de revue hors ligne

Après une collecte réussie, exécuter `npm run sources:report` et ouvrir localement `reports/editorial-inbox.html` avec un navigateur. Le tableau présente le média d'origine, la date, le sujet suggéré, un lien vers l'article original et une checklist de vérification. Il propose un filtre par rubrique. Il ne contient ni contenus complets de presse, ni accès à une fonction de publication. Le fichier reste ignoré par Git et ne fait pas partie du build de Netlify.

Le tableau est généré à partir du JSON local : il ne synchronise aucun commentaire ni validation et n'a **aucune connexion à un compte administrateur**. Le lancement de la collecte reste manuel.

