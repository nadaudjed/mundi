# MUNDI — Veille RSS

Ce système récupère uniquement les **titres, URLs, éditeurs et dates** des flux RSS. Les éléments sont des **candidats non vérifiés**, jamais des articles MUNDI publiés.

Commande locale : `npm run sources:collect`. Le fichier de sortie est `reports/editorial-inbox.json` (non publié par Netlify, à conserver hors de Git).

Sources initiales à vérifier régulièrement : Le Monde international, Le Monde économie et RFI monde, dans `content/sources.json`. Respecter leurs conditions d'utilisation et leurs limites d'accès.

**Processus :** collecte → sélection → lecture des articles originaux → vérification indépendante si nécessaire → rédaction originale dans MUNDI Studio → validation humaine explicite → PR éditoriale → publication.

Sécurité : seules les URL HTTPS de domaines autorisés sont téléchargées. Limites : 12 secondes et 2 Mo par flux, 30 items par source. Pas de copie d'articles complets ni de médias tiers. Les erreurs de réseau n'entraînent jamais la création d'une information fictive.

Tests : `npm run test:sources`. La collecte doit être lancée manuellement pour le moment. Pas d'actualisation automatique du site.
