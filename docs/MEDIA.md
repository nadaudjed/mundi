# Médias immersifs du fil MUNDI

> **24 novembre 2026 :** les récits et médias de démonstration ont été retirés du site. Le Fil ne contient plus que les publications sourcées et leurs cartes de données ; ce qui suit sur les démonstrations est historique.

## Composants
| Composant | Rôle |
| --- | --- |
| `MediaStage` | Choisit le média d'un récit : vidéo, sinon image, sinon visuel génératif (`StoryVisual`). |
| `VideoCard` | Courte vidéo en fond de carte : muette au départ, lecture seulement quand la carte est visible, pause/lecture (bouton, clic ou touche Espace), sous-titres WebVTT affichés par défaut et désactivables, barre de progression. |
| `ImageStory` | Photo ou illustration entière en haut de la carte, sur un fond flou de la même image ; léger zoom si les animations sont autorisées. |
| `MediaCredit` | Bouton « © » ouvrant auteur, licence, provenance (et description pour les vidéos). |
| `StoryMediaFigure` | Média d'une page de récit, crédits en légende. |

## Règles appliquées
- **Son** : aucune vidéo ne démarre avec le son. Le bouton « Activer le son » n'apparaît que si le fichier a une piste audio (`hasAudio`), et le son est recoupé quand la carte quitte l'écran.
- **Mouvement** : avec `prefers-reduced-motion: reduce`, aucune lecture automatique ni zoom ; la lecture reste possible à la demande.
- **Chargement différé** : seules la carte visible et ses voisines immédiates chargent leurs médias (`near`). Les autres n'ont ni `<source>` ni image.
- **Économie de données** : si l'appareil le demande (ou en 2G), aucune vidéo n'est téléchargée avant un geste.
- **Erreurs** : vidéo ou image indisponible → aperçu ou visuel de secours, message et bouton « Réessayer » ; le fil n'est jamais bloqué.
- **Formats** : chaque vidéo existe en WebM (VP9) et MP4 (H.264) ; le navigateur prend le premier qu'il sait lire.
- **Accessibilité** : `aria-label` descriptif sur chaque vidéo, sous-titres en français, texte alternatif sur chaque image.

## Récits « une idée par écran »
`lib/narratives.ts` découpe certains récits en trois écrans successifs : **l'accroche**, **le fait**, **l'explication**. Le bouton « Comprendre » et l'écoute apparaissent au dernier écran. Ces textes reprennent uniquement ce que dit déjà le récit de démonstration.

## Ajouter un média
1. Vérifier les droits : auteur, licence, provenance traçable. Sans ces trois éléments, le média n'entre pas.
2. Déposer le fichier dans `public/media/…` (vidéo : MP4 H.264 + WebM, avec un fichier `.vtt` de sous-titres et une image `poster`).
3. Le déclarer dans `mediaLibrary` (`lib/media.ts`) et l'associer au récit dans `storyMediaIds`.
4. Lancer `npm run test:e2e`.

## Bibliothèque de démonstration
Tous les médias actuels sont des créations originales générées par `npm run media:generate` (`scripts/generate-demo-media.mjs`, Chromium + ffmpeg). Aucune photo réelle n'est incluse pour l'instant : le composant `ImageStory` est prêt à recevoir des photos sous licence vérifiée (`nature: "photo"`).
