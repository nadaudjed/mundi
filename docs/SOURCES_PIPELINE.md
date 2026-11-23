# MUNDI — Veille RSS

Ce système récupère uniquement les **titres, URLs, éditeurs et dates** des flux RSS. Les éléments sont des **candidats non vérifiés**, jamais des articles MUNDI publiés.

Commande locale : `npm run sources:collect`. Le fichier de sortie est `reports/editorial-inbox.json` (non publié par Netlify, à conserver hors de Git).

Catalogue des sources : `content/sources.json`. Les flux Eurostat officiels « News » et « Environnement et énergie » sont activés pour la veille sur les métadonnées. Le Monde et RFI restent désactivés dans l'attente d'une vérification des autorisations et des conditions applicables. Les URLs des flux et leur disponibilité doivent être contrôlées régulièrement.

**Processus :** collecte → sélection → lecture des articles originaux → vérification indépendante si nécessaire → rédaction originale dans MUNDI Studio → validation humaine explicite → PR éditoriale → publication.

Sécurité : seules les URL HTTPS de domaines autorisés **et les sources explicitement approuvées pour la collecte des métadonnées** (`rightsStatus: approved_metadata_collection` et `rightsUrl`) sont téléchargées. Les formats RSS et Atom sont pris en charge. Limites : 12 secondes et 2 Mo par flux, 30 items par source. Pas de copie d'articles complets ni de médias tiers. Les erreurs de réseau n'entraînent jamais la création d'une information fictive.

Tests : `npm run test:sources`. La collecte doit être lancée manuellement pour le moment. Pas d'actualisation automatique du site.

## Tableau de revue hors ligne

Après une collecte réussie, exécuter `npm run sources:report` et ouvrir localement `reports/editorial-inbox.html` avec un navigateur. Le tableau présente le média d'origine, la date, le sujet suggéré, un lien vers l'article original et une checklist de vérification. Il propose un filtre par rubrique. Il ne contient ni contenus complets de presse, ni accès à une fonction de publication. Le fichier reste ignoré par Git et ne fait pas partie du build de Netlify.

Le tableau est généré à partir du JSON local : il ne synchronise aucun commentaire ni validation et n'a **aucune connexion à un compte administrateur**. Le lancement de la collecte reste manuel.


## Génération depuis GitHub — sans terminal (validation des droits préalable)

Le workflow `Editorial inbox — manual research export` est déclenchable manuellement depuis **GitHub > Actions > Editorial inbox — manual research export > Run workflow**. Il génère un dossier `mundi-research-inbox` (JSON + rapport HTML) à télécharger dans la page de l'exécution, conservé sept jours. Aucun accès de publication ni secret n'est nécessaire.

**Attention aux droits :** les flux du Monde sont référencés publiquement, mais leur usage professionnel/commercial est soumis à des restrictions explicites dans leurs mentions légales ; ils sont donc désactivés. La source RFI est également désactivée dans l'attente d'une vérification des droits et de l'URL. Deux flux **Eurostat** sont activés à titre de veille institutionnelle sur les métadonnées uniquement. Si aucun flux n'a les droits documentés et le statut autorisé, le workflow produit un rapport vide avec un avertissement.

Avant d'activer une source : confirmer que l'URL répond et que les conditions autorisent ce mode de collecte ; documenter l'accord ou le fondement de l'utilisation. Les métadonnées ne doivent pas être considérées comme libres de droits par défaut.

**Ce workflow ne met pas à jour le site public, ne produit pas de synthèses factuelles et ne valide aucune actualité.** L'étape de vérification humaine et de rédaction originale reste obligatoire.

## Premier fournisseur institutionnel autorisé : Eurostat

**Décision documentée :** la page [RSS officielle d'Eurostat](https://ec.europa.eu/eurostat/web/rss) propose un flux Atom de nouvelles générales et un flux « Environment and energy ». Leur format est `application/atom+xml`. Les adresses enregistrées dans `content/sources.json` proviennent de ces liens officiels.

La [politique officielle de réutilisation d'Eurostat](https://ec.europa.eu/eurostat/help/copyright-notice) indique que les contenus éditoriaux détenus par l'Union européenne relèvent de CC BY 4.0, avec attribution et indication des modifications. Certaines données et œuvres de tiers sont exclues ou soumises à conditions : **ne pas en déduire le droit de republier des photos, des illustrations, des documents tiers ou des jeux de données exceptionnels**.

MUNDI ne collecte que les *titres, liens, dates et identités des sources* pour identifier des sujets. Le rapport indique le lien vers les conditions de réutilisation. Il ne doit pas être présenté comme une publication d'informations vérifiées par MUNDI. La rédaction doit accéder à la source, vérifier les faits, respecter les licences et croiser les informations si nécessaire.

**Limite de vérification :** la provenance des adresses et la politique de licence ont été vérifiées sur les pages officielles, mais la collecte HTTP réelle depuis GitHub Actions n'a pas encore été exécutée sur les nouvelles URLs. Si un flux change de format ou ne répond plus, le workflow inscrit une erreur, sans inventer de candidats.

## Veille quotidienne interne automatique

Le workflow GitHub Actions `Editorial inbox — manual research export` démarre aussi automatiquement chaque jour à **06:23 UTC** (l'exécution peut être retardée par GitHub). Il reste déclenchable manuellement. Il télécharge uniquement les métadonnées des sources institutionnelles autorisées. Les archives de recherche restent dans l'espace des Actions GitHub pendant sept jours ; elles ne sont pas publiées sur Netlify.

Le rapport indique maintenant, **source par source**, si la collecte a réussi, si un flux était vide, s'il a échoué ou si ses droits étaient insuffisants, ainsi que le nombre de sujets candidats. Si toutes les sources activées échouent, le workflow apparaît en échec, tout en conservant son rapport pour le diagnostic. Aucun titre candidat n'est réputé vérifié et aucune publication n'est créée automatiquement. Les résultats de collecte ne constituent pas un service de notification garanti.

## Mise à jour — bibliothèque durable avant lancement public

Le fondateur demande une bibliothèque abondante et continuellement alimentée **avant** le lancement au grand public. Le système précédent ne conservait ses recherches que sept jours dans les artifacts. Après la PR bibliothèque, une seconde étape du workflow quotidien **archive les seules métadonnées candidates** dans la branche privée `editorial-stock` sur une fenêtre d'un an (maximum 12 000 entrées), avec dédoublonnage et sans publication automatique. Une archive HTML/JSON de suivi `mundi-editorial-library-dashboard` est disponible pendant 30 jours dans l'exécution GitHub Actions.

Cette réserve de pistes **n'est pas un stock d'articles**. Le tableau de bord distingue les 120 idées pédagogiques non vérifiées, les pistes de sources non vérifiées, les contenus approuvés en réserve et les véritables publications. Il signale les seuils manquants, les rubriques sans publication, le risque de dépendre d'une seule institution source et les ruptures de cadence. Seule l'approbation humaine peut rendre une publication diffusée.

Voir [le guide de la bibliothèque éditoriale](EDITORIAL_LIBRARY.md), le registre des idées `editorial/library/evergreen-ideas.json` et la liste de sources à étudier `editorial/library/source-expansion.json`. Les flux non autorisés restent strictement désactivés. Le tableau de bord est **privé**, sans effet sur Netlify.
