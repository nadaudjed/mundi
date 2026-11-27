# Passer MUNDI en gratuit : dépôt public et Cloudflare Pages

Depuis le 26/11 à 14 h 47, les tâches automatiques de GitHub ne démarrent plus. Il s'agit des
publications, des photos et de l'audio. Le dépôt est privé, et le quota gratuit d'un dépôt privé
semble épuisé. Sur un dépôt **public**, ces tâches sont gratuites et sans limite. Le site passe
aussi de Netlify, dont le forfait gratuit est très limité en mises en ligne, à **Cloudflare Pages**,
qui est gratuit.

## Ce qui reste privé

| Élément | Où il va | Pourquoi |
| --- | --- | --- |
| Stock éditorial (brouillons, vérifications, sujets refusés, registre des recherches) | Nouveau dépôt **privé** `mundi-stock`, branche `editorial-stock` | Seulement stocké : aucune tâche n'y tourne, donc il ne consomme rien |
| Clés (Anthropic, OpenAI, crochet de déploiement, clé du stock) | Secrets du dépôt | Les secrets restent cachés, même sur un dépôt public |
| Rapports détaillés des tâches (artefacts) | Plus publiés quand le dépôt est public | `if: github.event.repository.private` dans les workflows |

Le reste devient visible : le code, l'historique et les tickets. Vérifications faites :

- aucune clé n'est écrite dans le code ;
- aucune adresse e-mail personnelle ne figure dans l'historique ;
- le stock n'a jamais été fusionné dans `main`.

Les **journaux des anciennes tâches** deviendront lisibles : on y voit les titres et les liens de
brouillons non publiés. Ils peuvent être effacés avant la bascule. Je le fais si tu le demandes, mais
c'est définitif.

## Les étapes, dans l'ordre

1. **Créer le dépôt privé du stock.** Sur github.com, en haut à droite : « + », puis « New repository ».
   - Nom : `mundi-stock`.
   - Cocher **Private**.
   - Ne rien cocher d'autre.
   - Cliquer sur « Create repository ».

   Dis-le-moi ensuite : j'y copie le stock actuel.

2. **Créer la clé d'accès au stock.**
   - Va dans github.com/settings/personal-access-tokens, puis « Generate new token » (« Fine-grained »).
   - Nom : « MUNDI stock ». Expiration : 1 an.
   - Repository access : « Only select repositories », puis choisir `mundi-stock`.
   - Permissions : « Contents », en lecture et écriture.
   - Copier la clé affichée.

   Dans le dépôt `mundi` : Settings, puis Secrets and variables, puis Actions, puis « New repository secret ». Nom : `MUNDI_STOCK_TOKEN`. Valeur : la clé copiée.

   Je ne peux pas faire cette étape à ta place : c'est un accès à ton compte.

3. **Donner aux tâches Claude l'accès au stock.** Dans les réglages de l'environnement des tâches
   planifiées Claude (accès GitHub), ajouter le dépôt `mundi-stock`. Les rédacteurs y déposent leurs
   brouillons (voir `editorial/agents/MAX_TASKS.md`).

4. **Rendre le dépôt `mundi` public**, une fois que j'ai confirmé que le stock est copié.
   - Settings, puis tout en bas « Danger Zone », puis « Change visibility », puis « Make public ».
   - Je supprime ensuite la branche `editorial-stock` du dépôt public.

5. **Créer le site sur Cloudflare Pages.**
   - Crée un compte gratuit sur dash.cloudflare.com.
   - Va dans Workers & Pages, puis « Create », puis « Pages », puis « Connect to Git ». Choisis GitHub, puis le dépôt `mundi`, branche `main`.
   - Framework preset : « None ».
   - Build command : `npm run build`. Build output directory : `out`.
   - Variables d'environnement : `MUNDI_SITE_URL` = l'adresse donnée par Cloudflare, par exemple `https://mundi.pages.dev`.
   - Cliquer sur « Save and Deploy ».

   Ensuite, dans le dépôt `mundi` :

   - Settings, puis Secrets and variables, puis Actions, puis l'onglet « Variables ». Ajouter `MUNDI_SITE_URL` avec la même adresse.
   - Dans Cloudflare, ouvrir Settings, puis Builds, puis « Deploy hooks ». Créer un crochet, copier son adresse, et l'ajouter en secret `MUNDI_DEPLOY_HOOK`. Il sert au nouveau build de minuit.

6. **Relancer la publication du jour.** Je m'en occupe et je vérifie que le site Cloudflare montre
   bien les nouveaux articles. Netlify peut ensuite être arrêté.

## Ce qui a été adapté dans le code

- `scripts/stock-remote.sh` : les workflows lisent et écrivent le stock par le remote `stock`. Il pointe vers `mundi-stock` quand le secret `MUNDI_STOCK_TOKEN` existe, sinon vers l'ancienne branche, pour que rien ne casse avant la bascule.
- `editorial/agents/MAX_TASKS.md` : les tâches Claude clonent `mundi-stock`, avec un repli sur l'ancienne branche tant qu'il n'existe pas.
- `scripts/cloudflare-files.mjs` : après le build, il écrit `out/_redirects` à partir de `netlify.toml`. On garde ainsi une seule liste de redirections.
- `MUNDI_SITE_URL` : c'est l'adresse du site pour les liens de partage (`lib/site.ts`) et pour le contrôle après mise en ligne (`check-live-netlify.mjs`).
- Mentions légales : l'hébergeur affiché est Cloudflare quand le site est construit par Cloudflare.
- Le rafraîchissement de minuit accepte un crochet Cloudflare (`MUNDI_DEPLOY_HOOK`).
- Notifications d'édition : elles ne sont pas activées aujourd'hui (pas de clés). Sur Cloudflare, elles restent « bientôt disponibles ». Les deux fonctions Netlify ne sont pas portées.
