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


## Génération depuis GitHub — sans terminal (validation des droits préalable)

Le workflow `Editorial inbox — manual research export` est déclenchable manuellement depuis **GitHub > Actions > Editorial inbox — manual research export > Run workflow**. Il génère un dossier `mundi-research-inbox` (JSON + rapport HTML) à télécharger dans la page de l'exécution, conservé sept jours. Aucun accès de publication ni secret n'est nécessaire.

**Attention aux droits :** les flux du Monde sont référencés publiquement, mais leur usage professionnel/commercial est soumis à des restrictions explicites dans leurs mentions légales ; ils sont donc désactivés. La source RFI est également désactivée dans l'attente d'une vérification des droits et de l'URL. Aucun flux n'est activé par défaut : si les permissions ne sont pas confirmées, le workflow produit un rapport vide avec un avertissement, au lieu de collecter malgré tout.

Avant d'activer une source : confirmer que l'URL répond et que les conditions autorisent ce mode de collecte ; documenter l'accord ou le fondement de l'utilisation. Les métadonnées ne doivent pas être considérées comme libres de droits par défaut.

**Ce workflow ne met pas à jour le site public, ne produit pas de synthèses factuelles et ne valide aucune actualité.** L'étape de vérification humaine et de rédaction originale reste obligatoire.
