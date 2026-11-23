# MUNDI — Photographies documentaires pour les sujets quotidiens

## Intention
Chaque journaliste ou professeur produit un article. Une tâche distincte cherche alors une **photo thématique réelle** selon son titre et la rubrique, puis la place dans son fond immersif. Les textes, dates, chiffres et références restent du HTML modifiable, jamais imprimés dans la photo. Les 12 rubriques possèdent des vocabulaires de recherche différents.

## Sources et droits
Pilote Wikimedia Commons uniquement, via l'API MediaWiki : recherche d'images et champs de licence, d'auteur, et URL d'origine. Les photos sont limitées aux formats JPEG, PNG, WebP, sous CC0 1.0 et CC BY / CC BY-SA 2.0, 3.0 ou 4.0 avec métadonnées de droit cohérentes. Un crédit et des liens vers licence + image originale sont toujours affichés.

Aucune image reprise automatiquement de Google Images, Getty, Reuters, AFP ou d'un autre média sous droit réservé. Les données Wikimedia peuvent être fausses : le contrôle automatique ne remplace pas un audit humain périodique des crédits. Pour une personnalité, une guerre, un accident ou un fait historique précis, le média doit être traité comme **illustration générique et non comme une photographie de l'événement**, sauf vérification explicite.

## Automatisation
La tâche GitHub Actions de photos se lance après une nouvelle publication, quotidiennement à 11:35 UTC ou manuellement. Aucun appel Anthropic n'est consommé. Elle cherche d'abord les mots significatifs du titre, puis une recherche générale de la rubrique.

Seules des vignettes dont les signatures de fichiers sont cohérentes, ne dépassant pas 2,5 Mo et provenant de upload.wikimedia.org sont archivées en local sous public/media/editorial. Le registre de photographies est content/editorial-images.json ; les URL de droits et les crédits y sont conservés. Netlify sert les images depuis le propre domaine MUNDI.

Une image absente ou une panne Commons n'interrompt pas la publication : le décor MUNDI original reste affiché. La mention publique est « Photo d'illustration », car l'image ne constitue pas une preuve de l'événement raconté. Le même mécanisme sert les articles des professeurs, dès qu'ils sont publiés.

## Contrôles
Tester : node --test tests/editorial-images.test.mjs.
Lancer manuellement : node scripts/collect-editorial-images.mjs.
Limiter les téléchargements : MUNDI_IMAGES_MAX=8.
Surveiller le rapport dans GitHub Actions après le premier lancement en conditions réelles.

## Recherche V2
Les recherches Wikimedia trop longues ont été remplacées par des expressions visuelles de 1 à 2 mots ou des indices spécifiques extraits du titre. Le journal de collecte expose le nombre de résultats et quelques métadonnées de licence lorsque rien n'est retenu, sans divulguer de clés. Aucun assouplissement sur le droit à l'image, l'attribution ni les formats acceptés.

Wikimedia Commons utilise désormais également le CDN officiel thumb.wikimedia.org ; les deux hôtes exacts upload.wikimedia.org et thumb.wikimedia.org sont acceptés. Les liens de licence Creative Commons legacy en HTTP sont normalisés en HTTPS et vérifiés sur le domaine exact creativecommons.org, avec/sans barre finale ou suffixe deed.
