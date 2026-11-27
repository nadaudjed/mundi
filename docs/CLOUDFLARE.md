# MUNDI sur Cloudflare Workers (ticket #129)

Adresse officielle : **https://mundi.nadaudjacques004.workers.dev**.
L'ancienne adresse, https://mundiapptest.netlify.app, ne sert plus qu'à rediriger et à laisser les
lecteurs emporter leurs données.

## Comment le site est publié

- À chaque fusion sur `main`, **Workers Builds** (Cloudflare) lance `npm run build` puis `npx wrangler deploy`.
  `wrangler.jsonc` publie le dossier `out/` (pages statiques) et le petit Worker `worker/index.mjs`,
  qui ne répond qu'aux adresses `/api/*` (notifications) et à une tâche planifiée toutes les 10 minutes.
- Chaque build écrit `out/version.json` : identifiant du build, commit, date d'édition (Paris).
  Le contrôle de production le lit pour vérifier que la bonne version est en ligne.
- **Après minuit (Paris)**, sans nouveau commit, `.github/workflows/edition-refresh.yml` reconstruit et
  redéploie le Worker depuis GitHub, puis vérifie sur l'adresse officielle que la version servie est
  celle qu'il vient de publier et qu'elle porte la date du jour. Avec ou sans publication du jour,
  l'accueil passe alors à la nouvelle date ; sans publication, il affiche « Dernière édition ».
- `.github/workflows/production-smoke.yml` (après fusion, et chaque jour à 13 h 15) attend que
  Cloudflare serve le commit fusionné, puis contrôle : pages, photos, MP3, date d'édition, liens de
  partage (accueil, article, dossier cobalt), « Suivre ce dossier », Bibliothèque et transfert,
  manifeste, ancienne URL des parfums, état des notifications et redirection de Netlify.

## Réglages à faire par Jacques

### 1. Déploiement de minuit (indispensable)

Dans Cloudflare : **My Profile → API Tokens → Create Token → modèle « Edit Cloudflare Workers »**,
compte MUNDI, puis « Create ». Copier le jeton. Noter aussi l'**Account ID** (page d'accueil du compte,
colonne de droite, ou Workers & Pages → Overview).

Dans GitHub, dépôt `mundi` : **Settings → Secrets and variables → Actions → Secrets** :
- `CLOUDFLARE_API_TOKEN` = le jeton ;
- `CLOUDFLARE_ACCOUNT_ID` = l'Account ID.

Puis onglet **Variables** : `MUNDI_SITE_URL` doit valoir `https://mundi.nadaudjacques004.workers.dev`,
ou être supprimée (le code prend cette adresse par défaut ; une ancienne valeur `netlify.app` est ignorée).

Le secret `MUNDI_DEPLOY_HOOK` n'est plus nécessaire.

### 2. Notifications (pour les ouvrir)

Générer une paire de clés une seule fois, sur un ordinateur : `npx web-push generate-vapid-keys`.
Dans Cloudflare : **Workers & Pages → mundi → Settings → Variables and Secrets → Add**, type **Secret** :
- `VAPID_PUBLIC_KEY` = la clé publique ;
- `VAPID_PRIVATE_KEY` = la clé privée (ne jamais la partager).

Rien d'autre : le stockage des abonnements (Durable Object, offre gratuite) est créé au déploiement.
Sans ces secrets, `/api/push` répond `{ "enabled": false }` et « Mes sujets » affiche
« Indisponibles pour l'instant ». Les secrets restent en place d'un déploiement à l'autre.

### 3. Redirection de Netlify

Rien à faire : Netlify construit toujours depuis `main`. En production Netlify seulement, le build écrit
un `_redirects` qui renvoie chaque page vers la même page de l'adresse officielle (paramètres compris),
en **302 (temporaire)**. Restent servis par Netlify : `/transfert/` et ses fichiers, et l'accueil, qui
mène au transfert s'il reste des données à emporter (utile pour l'application installée sur iPhone),
sinon à l'adresse officielle.

Quand les lecteurs ont eu le temps de transférer leurs données : Netlify → Site configuration →
Environment variables → `MUNDI_LEGACY_REDIRECT_STATUS` = `301`, puis « Trigger deploy ». Les
navigateurs gardent une 301 en mémoire : ne pas le faire avant.

## Transfert des données des lecteurs

Le navigateur range les données de MUNDI par adresse. Pour les retrouver sur la nouvelle :

1. sur l'appareil et dans le navigateur où l'on lisait MUNDI, ouvrir
   https://mundiapptest.netlify.app/transfert/ (ou simplement l'ancienne adresse, qui y mène) ;
2. toucher « Emporter mes données vers la nouvelle adresse » ;
3. sur la nouvelle adresse, vérifier la liste et toucher « Importer dans ce navigateur ».

Sont transférés : articles enregistrés, dossiers suivis (avec les mises à jour déjà vues), sujets de
« Mes sujets », progression de « Réviser », thème. Les données voyagent dans le lien, après le « # »
(jamais envoyé à un serveur). L'import s'ajoute à l'existant ; le refaire ne crée pas de doublon.
Un fichier de sauvegarde permet aussi de changer d'appareil. Lien depuis la Bibliothèque et la page
Confidentialité de la nouvelle adresse : `/transfert/`.

## Notifications sur la nouvelle adresse

Un abonnement est lié à l'adresse du site : ceux pris sur Netlify ne suivent pas. Chaque lecteur doit
réactiver l'interrupteur dans « Mes sujets » sur la nouvelle adresse (sur iPhone : depuis la nouvelle
icône ajoutée à l'écran d'accueil). Le bouton « M'envoyer une notification d'essai » vérifie l'appareil.
Une annonce part quand la version en ligne contient de nouvelles publications (contrôle toutes les
10 minutes, au plus une par heure).

Tests physiques restant à faire après l'ajout des clés : iPhone (application installée) et Android
(Chrome) : activer, recevoir l'essai, refuser la permission, désactiver.

## Revenir à la version précédente

Dans Cloudflare : **Workers & Pages → mundi → Deployments**, choisir la dernière version qui
fonctionnait, menu « … » → **Rollback**. Ou, sur un ordinateur : `npx wrangler rollback` (liste les
versions, puis confirme). `/version.json` indique ensuite le build servi. Le prochain déploiement
(fusion ou minuit) republie `main` : corriger `main` avant.
