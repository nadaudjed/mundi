# MUNDI V10 — Premier récit immersif, **aperçu de relecture**

**Statut : expérimentation interne, NON publiée et NON approuvée.**
**Dernière préparation : 23 novembre 2026.**

## Livrable

Un récit de **quatre écrans** à parcourir au doigt, à la souris ou au clavier : « L'envers de nos vêtements ». Le sujet est tiré du dossier éditorial `editorial/reviews/textile-2024/` et de ses sources officielles.

1. **L'ampleur** — les 2,3 millions de tonnes *générées* en 2024 dans l'UE, avec la signification du mot « générées ».
2. **La distinction** — 2,3 millions de tonnes *générées* et 1,4 million de tonnes *traitées*, illustrées avec une même échelle, mais **sans suggérer que les déchets traités sont nécessairement exactement ceux générés la même année**.
3. **Le dénominateur** — 78 % *parmi les déchets textiles traités*, et non 78 % de tous les déchets générés.
4. **Le mécanisme** — le cadre européen de responsabilité élargie des producteurs, puis une incertitude clairement identifiée sur ses résultats futurs.

Les écrans affichent les chiffres **en texte HTML natif**. Les fonds sont des textures CSS originales sans statistique intégrée et **non issues des maquettes de la PR #27, encore en attente d'approbation graphique**. Aucun média tiers n'est reproduit.

## Comment voir l'aperçu sans coder

1. Ouvrir [GitHub Actions : MUNDI — private story preview V10](https://github.com/nadaudjed/mundi/actions/workflows/story-preview.yml).
2. Choisir **Run workflow** sur `main` après fusion de la PR correspondante.
3. Quand l'exécution est terminée, télécharger l'archive **mundi-v10-brouillon-visuel** dans la section *Artifacts*.
4. Extraire et ouvrir `editorial-story-v10.html` dans Safari/Chrome/Firefox (sur iPhone, l'ouverture de fichiers HTML peut nécessiter une application ou un ordinateur).
5. Swiper verticalement. Les boutons **Lecture** et **Pause** permettent d'évaluer la hiérarchie sans effets.
   
Alternative développeur : `npm run preview:story`, puis ouvrir localement `reports/editorial-story-v10.html`. Le fichier est complètement autonome, sans Internet pour son rendu ; seuls les liens vers les sources ouvrent des pages externes.

## Tester aussi les composants développés par Claude

Le fichier `editorial/reviews/textile-2024/data-cards.draft.json` utilise le format **`mundi-data-cards-v1`** des cartes de données créées par Claude. Il contient les mêmes quatre étapes, les chiffres et leurs périmètres, mais **aucune image de la direction artistique non approuvée**.

Pour vérifier cette autre prévisualisation : ouvrir [MUNDI Studio](https://mundiapptest.netlify.app/atelier/), puis importer ce fichier dans la partie **cartes de données**. Le contenu doit rester marqué **« Brouillon — non publié »**. Le format des cartes est celui de Claude ; le générateur HTML fournit, en parallèle, une proposition de mise en scène destinée à la revue graphique.

**Avertissement :** l'application étant publique, l'import local du fichier ne constitue pas une publication ; ne pas partager publiquement le fichier tant que le fond éditorial n'a pas été approuvé. Vérifier aussi que les données ne sont jamais envoyées à un service externe.

## Contrôle éditorial et sécurité

- Les sources sont [Eurostat, 12 novembre 2026](https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20261112-1) et [Commission européenne, 16 octobre 2025](https://environment.ec.europa.eu/news/revised-waste-framework-directive-enters-force-2025-10-16_en).
- Les chiffres et leur interprétation restent **à relire par une personne responsable** avant toute publication MUNDI. Ils sont attribués, mais la vérification des métadonnées ne garantit pas à elle seule toute la portée méthodologique des indicateurs.
- Le système valide que le dossier a `status: draft`, `reviewedBy: ""`, `publishedAt: null`, et `editorialNotes.approvalRequired: true`.
- L'archive HTML est générée dans `reports/` (ignoré par Git) et conservée **7 jours** dans GitHub Actions, avec droits d'accès liés au dépôt. **Elle n'est pas envoyée à Netlify.**
- Aucune modification de `content/publications.json` ou `content/scenes.json`. Le vrai fil public reste inchangé.
- Aucun contenu ne peut être publié depuis l'aperçu ; pas de bouton « publier » ni de backend.
- Le script échoue si le statut devient `published` ou si le dénominateur du taux est supprimé.
- Des tests vérifient l'échappement HTML, le maintien des sources et la différence entre flux générés et traités.

## Critères pour autoriser une publication future

- [ ] Vérifier les définitions des statistiques Eurostat, la base de calcul et la comparabilité des flux.
- [ ] Relire la formulation exacte du droit européen, son entrée en vigueur et ses échéances de mise en œuvre.
- [ ] Approuver la formulation finale et toutes les sources utilisées ; ajouter si nécessaire un second regard documentaire.
- [ ] Tester l'aperçu sur iPhone et sur Android, y compris en mouvement réduit.
- [ ] Approuver le style graphique final (#27 / #26) et les droits de tous les médias utilisés.
- [ ] Identifier la personne responsable de la validation et la date de publication.
- [ ] Ouvrir **une PR éditoriale distincte** vers `content/publications.json`, nécessitant une **fusion explicite**.

### Collaboration ChatGPT + Claude

ChatGPT prépare et sécurise l'histoire/documentation et la direction graphique. Claude peut réutiliser les contenus **après approbation**, en les convertissant vers les composants `mundi-data-cards-v1` et les scènes plein écran développées dans la PR #31. Cette V10 est une étape de revue, **pas encore une intégration de ces données au fil public**.
