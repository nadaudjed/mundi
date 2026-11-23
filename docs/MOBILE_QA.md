# Mobile, PWA et médias accessibles — vérifications et limites (ticket #13)

Ce document dit ce qui a été **réellement testé** (automatiquement, dans Chromium via Playwright) et ce qui **reste à vérifier sur de vrais appareils**.

## Application installable (PWA)

| Élément | Fichier |
| --- | --- |
| Manifeste (`/manifest.webmanifest`) : nom, couleurs, icônes 192/512 et « maskable », raccourcis | `app/manifest.ts` |
| Icônes générées (PNG + SVG, icône Apple 180 px) | `scripts/generate-icons.mjs` → `public/icons/` (`npm run icons:generate`) |
| Service worker minimal | `public/sw.js` (enregistré en production seulement par `components/PwaSetup.tsx`) |
| Page « Vous êtes hors connexion » | `app/hors-ligne/page.tsx` |
| Bouton « Installer » et page d'aide | `lib/install.ts`, `components/InstallButton.tsx`, `app/application/page.tsx` |

**Ce que la PWA ne fait pas** : MUNDI ne fonctionne **pas** hors connexion. Le service worker ne garde que les fichiers techniques du site (CSS, JS, polices) et la page « hors connexion ». Aucun récit, image ou vidéo n'est mis en cache. La page d'installation le dit clairement.

## Réseau lent et chargement progressif

- Seules la carte visible et ses voisines immédiates attachent leurs médias. L'image d'aperçu d'une vidéo n'est demandée que lorsque la carte est proche.
- **Économie de données** (`navigator.connection.saveData`, ou réseau 2G) : aucune vidéo n'est téléchargée ni lancée avant un geste ; un message « touchez ▶ » s'affiche (`lib/network.ts`).
- Poids des médias de démonstration : vidéos de 54 à 137 Ko, images de 39 à 131 Ko.

Mesure du test `tests/e2e/mobile-network.spec.ts` (Chromium, profil « 3G lente » simulé : 400 kbit/s, 400 ms de latence, fichiers texte compressés en gzip comme sur Netlify) :

| Mesure | Résultat |
| --- | --- |
| Premier affichage (FCP) de l'accueil | ≈ 2,0 s |
| Total transféré jusqu'au repos du réseau | ≈ 380 Ko |
| Vidéos téléchargées au départ | aucune |

Le test échoue si le premier affichage dépasse 5 s ou si une vidéo éloignée est téléchargée. Ces chiffres viennent d'une simulation, pas d'un vrai téléphone.

## Erreurs de médias

Si une vidéo ne se charge pas : l'image d'aperçu reste, un message « Vidéo indisponible pour le moment » et un bouton « Réessayer » s'affichent, et le fil continue de défiler. Si l'aperçu manque aussi, le visuel génératif du sujet le remplace. Une image manquante est remplacée de la même façon (« Illustration indisponible pour le moment »). Tout cela est testé en bloquant volontairement les fichiers.

## Accessibilité vérifiée automatiquement

- Lien d'évitement, navigation au clavier jusqu'aux commandes vidéo, touche Espace pour lecture/pause.
- Sous-titres WebVTT valides, affichés par défaut, désactivables.
- Analyse **axe-core** (règles WCAG 2.0/2.1 A et AA, dont les contrastes) sur l'accueil, Explorer, une page de récit, l'installation, À propos et hors connexion : aucune violation. Les pastilles de sujet choisissent automatiquement un texte foncé ou blanc lisible (`inkOn` dans `lib/topics.ts`).

Un outil automatique ne remplace pas un test avec un lecteur d'écran (VoiceOver, TalkBack).

## Limites connues — Safari iOS (non testé sur un vrai iPhone)

- Pas d'événement `beforeinstallprompt` : impossible d'afficher la fenêtre d'installation. Le bouton « Installer » mène donc à la page d'aide (Partager → « Sur l'écran d'accueil »).
- `navigator.connection` n'existe pas : le mode économie de données ne peut pas être détecté ; la lecture automatique reste muette et limitée aux cartes visibles.
- La lecture automatique exige `muted` et `playsInline` (c'est le cas).
- Le WebM n'est pas lu partout : le MP4 (H.264) sert de solution de repli.
- Sur iOS, le stockage d'une application installée est séparé de celui de Safari : les sujets et récits enregistrés ne sont pas partagés entre les deux.
- La barre d'état utilise `black-translucent` : à vérifier sur un iPhone avec encoche.

## Limites connues — Android réel (non testé)

Les tests utilisent l'émulation « Pixel 7 » de Chromium, pas un vrai téléphone. Restent à vérifier : l'installation depuis Chrome Android, l'icône « maskable » sur différents lanceurs, la fluidité du défilement et la consommation de batterie des vidéos.

## Vérifier à la main (5 minutes)

1. Ouvrir l'aperçu Netlify sur un téléphone.
2. Android/Chrome : menu ⋮ → « Installer l'application ». iPhone/Safari : Partager → « Sur l'écran d'accueil ».
3. Lancer MUNDI depuis l'icône, faire défiler le fil, couper le réseau et rouvrir une page : la page « Vous êtes hors connexion » doit s'afficher.
