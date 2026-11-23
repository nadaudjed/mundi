# MUNDI · Language of motion · épisode pilote sans statistiques

**Propriétaire artistique : ChatGPT (#26).** **Intégration : Claude Code (#30).**
**État : expérimental, aucun média publié.**

## Intention

La sensation d'un **plan de cinéma que l'on traverse en swipant**. Pas une pile de cartes, pas un diaporama PowerPoint, et pas une affiche sportive animée. Chaque écran porte UNE idée claire. Le graphisme crée un réflexe de curiosité, puis laisse le fond (la compréhension) prendre le relais.

| Scène | Rôle | Composition | Animations contrôlées |
|---|---|---|---|
| 01 · Matière | **Accrocher** | Texture textile pleine hauteur, plan serré, titre « L'envers de nos vêtements » et micro-sous-titre | 0–250ms : matière immobile ; 250–1 050ms : apparition successive des deux lignes et de l'accent éditorial ; 400–18 000ms : dérive lente du décor ; aucune animation de chiffres |
| 02 · Trames | **Révéler le contexte** | Tissage et dégradé sombre derrière « Un chiffre. Un contexte. » ; zone de lecture stable et nette | 0–400ms : fondu de décor ; 180–1 100ms : titre se découvre mot à mot ; 400–1 350ms : micro-explication apparaît |
| 03 · Flux | **Donner envie d'aller plus loin** | Flux de fibres abstraites ; titre « Voir. Comprendre. Retenir. » ; perspective ouverte, pas une boucle de recyclage implicite | 0–1 100ms : trois mots apparaissent séquentiellement ; décor dérive lentement ; CTA final mène au récit complet |

*Les durées sont des **objectifs** de direction artistique, pas des garanties de performance. Le navigateur, les réglages utilisateur et la visibilité effective prévalent.*

## Hiérarchie typographique

1. **Idée centrale :** une phrase courte, sans-serif actuelle et généreuse, entre 54px sur mobile et 150px sur grands écrans ; graisses moyennes à fortes, interlignes serrés (0,92 à 1,0) et alignements francs.
2. **Contraste éditorial :** un seul fragment en italique élégant (Fraunces ou fallback serif), pour un mot-clé, jamais tout un paragraphe ; éviter le style sport/de compétition et les capitales hurlées.
3. **Information secondaire :** une seule ligne de contexte, 16–24px avec contraste réel ; jamais une légende collée sur une texture sans voile de lisibilité.
4. **Statistiques de production :** toujours un élément DOM distinct, piloté par `mundi-data-cards-v1`, avec unité, périmètre, période, dénominateur et lien vers la source. **Pas de police « dessinée » dans une image IA**.
5. **Texte de source :** un élément toujours accessible au toucher ou clavier, fixé dans la zone de lecture sûre, jamais un filigrane illisible.

## Gestes et micro-interactions

- **Swipe vertical :** une idée par écran. Scroll-snap natif, pas de capture agressive du geste.
- **Navigation discrète :** trois traits de progression en haut, grands hit targets transparents ; flèches haut/bas au clavier, boutons « Continuer » utilisables au toucher.
- **Pause :** suspend tout mouvement et révèle le texte normalement ; jamais une animation figée dans un état illisible.
- **Lecture :** retire presque tout le décor, coupe les mouvements et renforce les textes. Le mode lecture est un choix local à l'écran et ne change pas les données.
- **Réduction des animations :** une scène complètement lisible en statique, sans mouvement ni scrolling artificiellement lissé.
- **Audio :** aucune lecture ou son automatique dans le prototype. Une éventuelle narration doit être initiée explicitement par l'utilisateur.
- **Images :** fonds originaux, abstraits, sans chiffre ni texte ; pas de photo de presse ou d'illustration sous droits non validés.

## Ce qu'il faut éviter

- Bandeaux en biseau, glow néon partout, titres inclinés/compressés, montants « score » et icônes sportives.
- Coins très arrondis pour chaque donnée ; la priorité est à la scène **plein écran**, pas à une collection de rectangles.
- Grandes plages vides entre un titre, une donnée et sa phrase de contexte, qui font artificiellement « template IA ».
- Animations qui transforment progressivement un nombre : cela risque d'être interprété comme une donnée changeante et nuit à l'accessibilité.
- Flèches causales ou proportionnelles dans les fonds décoratifs sans justification statistique.
- Curseurs, likes et commentaires fictifs affichés comme un contenu social réellement populaire.

## Contrat de passage en production

**Non publiable avant validation artistique et éditoriale du fondateur.** La PR #27 est en *draft*. Les fichiers `fond-*.svg` sont des ressources d'ambiance ; les injecter tels quels dans la galerie publique serait contraire à la règle de validation. Claude (#30) peut développer une enveloppe `ImmersiveScene` générique et des tests de mise en page, sans copier d'assets non approuvés. L'intégration de MUNDI Studio et les données approuvées restent sous leurs protections existantes.

### Critères de recette

- [ ] Ouverture lisible en moins d'une seconde après rendu initial, sans animation obligatoire
- [ ] Rendu 360×740, 390×844, 768×1024 et 1440×900 sans texte tronqué
- [ ] Une main peut naviguer par swipe ; les boutons ont une cible d'au moins 44px
- [ ] La progression indique réellement l'écran visible
- [ ] Pause et mode lecture ne cachent aucun texte
- [ ] `prefers-reduced-motion` coupe tous les mouvements
- [ ] Contrastes satisfaisants et texte accessible aux lecteurs d'écran
- [ ] Aucun chiffre factuel n'apparaît dans les fichiers SVG de décor
- [ ] Les données factuelles et les sources restent sous forme de contenu vérifiable
- [ ] Les états « démonstration », « brouillon » et « vérifié » restent différenciés

Ces critères ne sont **pas encore validés sur appareils réels** ; le prototype est un laboratoire d'intention et non une certification UX.
