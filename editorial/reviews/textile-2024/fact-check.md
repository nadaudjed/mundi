# Dossier pilote — déchets textiles dans l'UE (2024)

**Statut :** BROUILLON INTERNE · NON PUBLIÉ · NON APPROUVÉ PAR LA RÉDACTION

Rédigé pour tester le parcours MUNDI de la veille au décryptage original. À ne pas confondre avec une actualité validée.

## Vérifications documentaires

| Proposition du brouillon | Preuve consultée | Vérification supplémentaire |
| --- | --- | --- |
| 2,3 Mt de déchets textiles générés dans l'UE en 2024 | Eurostat, brève du 12/11/2026 | Vérifier la définition de « textile waste » et le jeu `env_wasgen` |
| Plus de la moitié issue des ménages | Même brève Eurostat | Vérifier ventilation et méthodologie |
| 1,4 Mt de déchets textiles traités en 2024, soit 63 % du total généré | Même brève Eurostat | **Ne pas suggérer que les 37 % restants seraient nécessairement non traités, stockés ou abandonnés : il s'agit de flux annuels distincts** |
| 78 % des **déchets textiles traités** ont été recyclés | Même brève Eurostat, jeux `env_wastrt` | Dénominateur : masse traitée, **pas** la totalité générée ; vérifier la cohérence des périmètres statistiques |
| Nouvelles règles européennes de responsabilité élargie des producteurs textiles en vigueur depuis le 16/10/2025 | Commission européenne, actualité du 16/10/2025 | Vérifier détails, échéances de transposition et situation nationale avant toute extrapolation |

## Sources consultées
1. [Eurostat — 2.3 million tonnes of textile waste generated in 2024](https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20261112-1), 12/11/2026 — chiffres des déchets.
2. [Commission européenne — Revised Waste Framework Directive enters into force](https://environment.ec.europa.eu/news/revised-waste-framework-directive-enters-force-2025-10-16_en), 16/10/2025 — contexte réglementaire.
3. [Commission européenne — Waste Framework Directive](https://environment.ec.europa.eu/topics/waste-and-recycling/waste-framework-directive_en) — cadre général, à relire en cas d'ajustement juridique.

Le recours à deux pages institutionnelles n'est **pas** une validation indépendante de tous les chiffres : l'estimation principale relève d'Eurostat et doit rester attribuée à Eurostat.

## Mise en récit proposée (mobile)
1. **Écran 1 · Le chiffre :** « 2,3 millions de tonnes de déchets textiles en un an dans l'UE ». Gros chiffre typographique original, mention 2024 bien visible.
2. **Écran 2 · La subtilité :** « 78 % recyclés… mais seulement parmi les déchets *traités*. » Diagramme simple de dénominateurs, sans pourcentage extrapolé.
3. **Écran 3 · Pourquoi maintenant :** réglementations européennes et questions de tri/recyclage ; bouton vers le décryptage et les sources.

**Visuels :** schémas originaux créés pour MUNDI ; aucune photo de presse ou image Eurostat reprise sans vérification des droits.

## Validation humaine requise
- [ ] Contrôler les chiffres et les définitions sur les références officielles
- [ ] Lire les données sources et vérifier le périmètre des statistiques
- [ ] Revoir les textes pour éviter de confondre « traité », « recyclé » et « généré »
- [ ] Confirmer la formulation de l'état du droit
- [ ] Vérifier les droits de tout média et l'attribution
- [ ] Relire le titre, le ton et l'orthographe
- [ ] Indiquer le nom du responsable ayant approuvé la publication
- [ ] Choisir une véritable date de publication et créer **une autre PR** modifiant `content/publications.json` (fusion manuelle)

**Important :** cette PR ne crée aucun contenu visible dans le fil ni dans `/actualites/`. Le statut reste `draft`.
