# Recette des parcours de lecture (ticket #120)

Ce document donne le résultat de la recette des parcours principaux après la refonte #113 (PR #116 à #119). Il sépare ce qui a été **testé automatiquement** de ce qui **reste à tester sur un vrai téléphone**.

Les tests automatiques sont dans `tests/e2e/parcours.spec.ts`. Ils tournent dans Chromium (Playwright), à 320 et 390 px de large, avec l'émulation tactile. Le texte agrandi est simulé en passant la taille de base du texte à 200 %.

## Tableau appareil × scénario × résultat

Légende :
- ✅ : testé et réussi.
- 📱 : reste à tester sur un appareil physique.
- — : sans objet.

| Scénario | Chromium 320 px | Chromium 390 px | Clavier (ordinateur) | Safari iPhone (physique) | Chrome Android (physique) |
| --- | --- | --- | --- | --- | --- |
| Ouvrir un sujet depuis l'accueil | ✅ | ✅ | ✅ | 📱 | 📱 |
| Retour à la bonne position dans l'accueil | ✅ | ✅ | — | 📱 | 📱 |
| Trouver les sources d'un article et ouvrir la première | ✅ | ✅ | — | 📱 | 📱 |
| Trouver la source d'un chiffre (décryptage du pilote) | ✅ (`today.spec.ts`) | ✅ | — | 📱 | 📱 |
| Écouter, pause, reprise | ✅ | ✅ | ✅ | 📱 | 📱 |
| Mini-lecteur dans l'écran, au-dessus du dock | ✅ | ✅ | — | 📱 | 📱 |
| Lecture qui continue pendant la navigation interne | ✅ | ✅ | — | 📱 | 📱 |
| Fermer le mini-lecteur | ✅ | ✅ | — | 📱 | 📱 |
| Écoute écran verrouillé, puis reprise | — (impossible à simuler) | — | — | 📱 | 📱 |
| Enregistrer puis retrouver dans Bibliothèque | ✅ | ✅ | ✅ | 📱 | 📱 |
| Lien partagé direct (sans animation d'entrée) | ✅ | ✅ | — | 📱 | 📱 |
| Texte agrandi à 200 % : aucune page ne déborde | ✅ | ✅ | — | 📱 (taille du texte du téléphone) | 📱 |
| Animation d'entrée de 5 s, première visite, passée au premier geste | ✅ (`intro.spec.ts`) | ✅ | — | 📱 | 📱 |

Défauts bloquants trouvés pendant cette recette automatique : **aucun**. Le seul défaut récent était le mélange du fil, qui pouvait mettre deux publications du même sujet à la suite. Il a été corrigé dans la PR #118.

## Étapes pour Jacques sur téléphone (10 minutes)

Faire les mêmes étapes sur un iPhone (Safari) et sur un téléphone Android (Chrome), avec l'adresse du site ou de la preview.

1. **Animation d'entrée.** Ouvrir l'accueil pour la première fois, ou ajouter `?intro=1` à l'adresse. L'animation dure environ 5 secondes. Toucher l'écran la coupe tout de suite.
2. **Ouvrir un sujet.** Faire défiler l'accueil jusqu'à « Dernières publications » et ouvrir un article. Revenir en arrière : l'accueil doit revenir au même endroit.
3. **Sources.** Dans l'article, toucher « N sources » dans la ligne grise sous le titre. La liste des sources s'affiche, et la première s'ouvre dans un nouvel onglet.
4. **Écoute.**
   - Toucher « Écouter le résumé », puis pause et reprise dans le mini-lecteur en bas.
   - Ouvrir Explorer : le son doit continuer.
   - **Verrouiller l'écran 30 secondes**, déverrouiller, et noter si le son a continué et si la reprise marche.
   - Fermer le mini-lecteur.
5. **Bibliothèque.** Enregistrer un article (bouton « Enregistrer »), ouvrir Bibliothèque et retrouver l'article. Le retirer, puis toucher « Annuler ».
6. **Texte agrandi.** Mettre le texte du téléphone en très grand (Réglages → Affichage), rouvrir l'accueil et un article. Noter si quelque chose sort de l'écran.

Pour chaque étape, noter : appareil, navigateur, réussi ou non, et ce qui a gêné.

## Limites

- Chromium émulé n'est pas Safari : le son écran verrouillé, la barre d'adresse qui bouge et les zones sûres de l'iPhone ne sont vérifiables que sur un appareil réel.
- Le texte agrandi simulé (200 %) est proche du réglage « très grand » des téléphones, mais pas identique.
