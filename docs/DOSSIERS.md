# Dossiers de référence et « Suivre ce dossier » (ticket #120)

Un dossier rassemble, sur une adresse stable, ce que MUNDI a publié sur un sujet. Le pilote est le dossier cobalt :
`/dossiers/cobalt-congolais/`.

Tout le contenu d'un dossier se trouve dans `content/dossiers.json`. Aucun texte n'est inventé : chaque élément reprend une publication déjà vérifiée et en cite la source.

## Structure d'une page dossier

1. **L'essentiel** : trois points, à lire en 30 secondes.
2. **Comprendre** : les chiffres clés (chacun avec sa source, son année et son périmètre), la carte créditée et la chronologie.
3. **Approfondir** : les publications reliées (actualité, récit, concept) et l'entretien, quand il existe.
4. **Ce qui a changé** : les mises à jour datées et sourcées. Un fait nouveau et une correction sont marqués différemment.
5. **Corrections** et **Sources**.

Le sommaire en haut de la page se parcourt au clavier.

## Les éléments manquants restent hors de la vue publique

Le champ `missing` liste ce qui manque. Il ne s'affiche **jamais** sur le site. Pour le cobalt, il manque :

- un entretien original, à fournir ou valider par Jacques ;
- des données originales sur la répartition de la valeur entre la mine, le raffinage et la batterie, qu'aucune publication vérifiée ne couvre encore ;
- un visuel propre au dossier (la carte du Shaba est réutilisée en attendant).

Tant que `interview` vaut `null`, la partie « Entretien » n'apparaît pas.

## Ajouter un élément validé

Après validation par Jacques, modifier `content/dossiers.json`, puis ouvrir une PR.

- **Entretien** : remplir `interview` avec une liste `[{ "question", "answer" }]`, une fois le texte validé par Jacques et par la personne interrogée. Retirer la ligne correspondante de `missing`.
- **Mise à jour (fait nouveau)** : ajouter en tête de `updates` un objet `{ "id": "AAAA-MM-JJ-mot-cle", "date": "AAAA-MM-JJ", "kind": "fait", "text", "href" (article MUNDI), "source": { "label", "url" } }`. Mettre à jour `updatedAt`. L'`id` ne doit jamais changer ensuite : c'est lui qui sert à savoir si le lecteur l'a déjà vue.
- **Correction** : ajouter à `corrections` `{ "date", "text" }` et une mise à jour de `kind: "correction"` qui explique ce qui a été corrigé.
- **Chiffre** : `{ "value", "label", "scope", "year", "source": { "label", "url" } }`. Les quatre informations sont obligatoires.

## « Suivre ce dossier »

- Le suivi est enregistré **sur l'appareil** (clé `mundi:follows:v1`), sans compte et sans notification.
- Suivre un dossier marque comme vues les mises à jour déjà parues. Une mise à jour publiée ensuite apparaît comme « Nouveau » dans Bibliothèque, avec sa date, son texte et un lien « Voir la mise à jour ».
- Elle compte comme consultée quand la partie « Ce qui a changé » s'affiche à l'écran.
- Un dossier retiré du site est signalé dans Bibliothèque, avec un bouton pour arrêter de le suivre.
- Si le stockage du téléphone est bloqué (navigation privée), un message le dit et le dossier reste lisible.

### Tester l'arrivée d'une mise à jour sur la preview

Sur une preview Netlify seulement (jamais en production) :

1. Ouvrir `/dossiers/cobalt-congolais/` et toucher « Suivre ce dossier ».
2. Dans « Ce qui a changé », toucher « Simuler une nouvelle mise à jour ».
3. Ouvrir Bibliothèque : le dossier porte « Nouveau » et la mise à jour simulée.
4. Toucher « Voir la mise à jour » : la page s'ouvre sur elle. Revenir à Bibliothèque : elle n'est plus nouvelle.

La mise à jour simulée n'existe que sur ce téléphone. Pour l'effacer, arrêter de suivre le dossier.

## Trouver un dossier : Explorer et l'accueil

- **Explorer** a un filtre « Dossiers » à côté d'Actualités, Récits et Concepts (adresse `/explorer/?genre=dossiers`). Les dossiers apparaissent aussi dans « Tous », au-dessus des articles, et la recherche les trouve (« cobalt » trouve le dossier). Les anciennes adresses de filtres ne changent pas.
- La recherche utilise un **index léger** (`dossierIndex()` dans `lib/dossiers.ts`) : titre, introduction, l'essentiel et la rubrique. La chronologie, les chiffres et les mises à jour ne sont pas envoyés à Explorer.
- La carte du dossier ouvre directement `/dossiers/<id>/`, où se trouve « Suivre ce dossier ».
- **Accueil** : pendant le pilote, un encadré « Dossier à suivre » mène au dossier dont le statut est `pilote`. Pour le retirer, passer le statut du dossier à `publie`.
- Sur petit écran, la ligne des formats d'Explorer passe à la ligne au lieu de défiler, pour que chaque filtre reste visible à 320 px.

## 10 articles prioritaires proposés après le pilote

Les cinq premiers comblent les manques du dossier cobalt. Les cinq suivants préparent les prochains dossiers, sur les sujets où MUNDI a déjà une actualité et un récit.

| # | Proposition | Format | Pourquoi |
| --- | --- | --- | --- |
| 1 | Du minerai à la batterie : qui raffine le cobalt congolais ? | Décryptage | Comble le manque principal (répartition de la valeur). |
| 2 | Entretien avec un spécialiste des chaînes d'approvisionnement minières | Entretien | Remplit l'emplacement « Entretien » du dossier. |
| 3 | Quotas et suspensions : ce que la RDC cherche à obtenir sur les prix | Concept | Explique la logique de la décision du 23 novembre. |
| 4 | Cobalt artisanal : qui sont les creuseurs du Katanga ? | Récit | Donne la dimension humaine, encore absente. |
| 5 | Batteries sans cobalt (LFP) : jusqu'où peuvent-elles réduire la demande ? | Concept | Relie le dossier à la batterie et au recyclage. |
| 6 | Terres rares : les stocks stratégiques français, mode d'emploi | Décryptage | Base d'un dossier « Terres rares » (actualité et récit déjà publiés). |
| 7 | Recycler les batteries en Europe : où en est la filière après la vente de BASF ? | Décryptage | Base d'un dossier « Recyclage des batteries ». |
| 8 | Graphite : pourquoi l'USGS prévoit +20 % de capacité d'ici 2030 | Actualité expliquée | Élargit le thème des matériaux critiques. |
| 9 | Gaz et électricité cet hiver : les chiffres à suivre semaine après semaine | Décryptage | Base d'un dossier « Énergie cet hiver », qui se met à jour souvent. |
| 10 | Hybrides chinois et quotas européens : ce qui change au 1er décembre | Actualité expliquée | Base d'un dossier « Commerce UE-Chine ». |

Chaque proposition doit être validée par Jacques avant rédaction.
