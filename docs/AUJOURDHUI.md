# Pilote V2 « Aujourd'hui » (ticket 109)

Objectif : un rendez-vous de cinq minutes. En moins d'une minute, le lecteur peut expliquer ce qui s'est
passé et pourquoi ça compte ; ensuite il approfondit, écoute, retient ou partage.

## Ce qui a été construit

| Élément | Où | Rôle |
|---|---|---|
| Sélection du jour | `content/aujourdhui.json` | Trois identifiants d'articles au plus, dans l'ordre d'affichage. |
| Choix et secours | `lib/today.ts` | Ignore un article retiré ou un doublon, complète avec les publications les plus récentes. |
| Décryptages | `content/decryptages.json`, validés par `lib/decryptage.ts` | Couche posée sur un article publié, sans le modifier. Une entrée mal formée fait échouer la construction. |
| Cartes du fil | `components/pilot/TodayCard.tsx` | Rubrique et format, visuel lié au sujet, titre court, deux phrases, « Comprendre » en action principale. |
| Page en trois niveaux | `components/pilot/DecryptageArticle.tsx` | L'essentiel, puis Comprendre (2 à 3 minutes), puis Approfondir (l'article complet et ses sources). |
| Mini-lecteur | `components/audio/AudioPlayer.tsx` | Un seul lecteur pour tout le site : il continue pendant les navigations internes. |
| Contrôle éditorial | `/atelier/aujourdhui/` | Statut de vérification, points à relire, sujets sensibles remontés en tête. Lecture seule. |
| Carte du Shaba | `public/media/pilote/`, `scripts/pilote-carte/` | Carte fabriquée une fois à partir de Natural Earth (domaine public). |

Les URL, les favoris, les préférences et la progression de « Réviser » ne changent pas : la question du
décryptage arrive dans « Réviser » sous une clé à part (`actualite:<slug>#decryptage`).

## Format d'un décryptage

- `essentiel.fait` et `essentiel.consequence` : deux phrases au total.
- `questions` : exactement « Que s'est-il passé ? », « Pourquoi ça compte ? », « Qu'est-ce qui reste incertain ? ».
  Chaque réponse cite les numéros des sources de l'article (`sources`, à partir de 0) ; une lecture de MUNDI sans
  source est marquée `"nature": "analyse"` et affichée comme telle.
- `figures` : valeur, libellé, **périmètre** et numéro de source pour chaque chiffre.
- `visual` : `carte`, `graphique` ou `archive` (la photo du catalogue de l'article), avec légende, texte alternatif,
  crédit et licence. Sans visuel pertinent, ou si l'image ne se charge pas : couverture typographique.
- `link` : un lien contextualisé vers un récit, un concept ou une actualité (retiré automatiquement si l'article lié disparaît).
- `quiz` : une question, sa réponse et son explication.
- `audioScript` : script parlé de 45 à 75 secondes (700 à 1 250 caractères). Le MP3 est fabriqué par la chaîne Piper
  existante (`.github/workflows/article-audio.yml`) : changer le script relance l'enregistrement.
- `verification` : `status` (`humain` si l'article a été relu par une personne, `ia` sinon), auteur, date, et la liste
  `toReview` des points à relire. `sensitive` : la raison pour laquelle le sujet remonte en relecture.

## Corriger un article à URL constante

1. Corriger le texte dans `content/publications.json` (ou avec le workflow « corriger ou retirer un article »),
   sans changer le `slug` : l'adresse reste la même, les favoris et les liens partagés continuent de marcher.
2. Mettre `updatedAt` à la date du jour : la page affiche « mis à jour le … ».
3. Si la correction change le sens (un chiffre, une date, un acteur, une conclusion), ajouter une entrée
   `corrections` (`date` et `text`) : elle s'affiche en haut de la page, jamais de correction silencieuse.
4. Mettre à jour le décryptage s'il reprend l'élément corrigé (même PR). Le MP3 de l'ancienne version cesse d'être
   proposé dès que `updatedAt` change, et la chaîne audio réenregistre la nouvelle version.
5. Pour retirer un sujet de l'édition du jour, il suffit de le retirer de `content/aujourdhui.json` ; un article retiré
   du site disparaît de lui-même de la sélection, remplacé par une publication récente.

## Comment les agents pourront alimenter le format (après validation du pilote)

Chaque rôle remplit sa part du même fichier, et rien n'est publié sans les contrôles existants (tickets 41, 43, 44) :

- **Journaliste** : le fait, sa conséquence (`essentiel`), la réponse à « Que s'est-il passé ? », les chiffres
  avec leur périmètre et leurs sources, la date du fait.
- **Professeur** : le mécanisme (« Pourquoi ça compte ? »), le précédent ou le concept à relier (`link`), la question
  et sa réponse expliquée (`quiz`), le script parlé.
- **Vérificateur** : contrôle chaque affirmation clé, chaque chiffre et chaque date contre les sources ; vérifie que
  le visuel est pertinent (une photo hors sujet est refusée) ; remplit `verification` et `toReview` ; marque
  `sensitive` pour les conflits, la santé, la finance, la justice, la sécurité et les élections.
- **Rédaction** : choisit les trois sujets de `content/aujourdhui.json` et relit dans `/atelier/aujourdhui/`.

La validation technique (`lib/decryptage.ts`) refuse déjà un chiffre sans source, un essentiel de plus de deux phrases,
une question manquante ou un script trop long ; elle ne remplace pas la vérification des faits.

## Après la preview : test avec une dizaine de lecteurs

Observer quel sujet ils ouvrent, ce qu'ils savent expliquer après une minute, s'ils trouvent les sources et ce qu'ils
partageraient. Puis proposer un déploiement progressif et quatre mesures de suivi : ouverture du décryptage, écoute
terminée, partage, retour à sept jours.
