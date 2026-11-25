# Poids des pages Explorer, Réviser et Bibliothèque (ticket #120)

## Comment mesurer

```
npm run build        # ou node scripts/build-e2e-sites.mjs
node scripts/measure-pages.mjs
```

Le script lit le site construit (`out/`) et additionne, pour chaque page, le HTML et les fichiers JavaScript et CSS qu'elle charge au premier affichage. Il donne la taille brute et la taille compressée (gzip, proche de ce qui passe sur le réseau). Les mesures avant et après ont été prises sur le même contenu (77 publications), le 25 novembre 2026.

## Ce qui pesait

Next.js recopie dans le HTML tout ce que le serveur passe à un composant client. Explorer, Réviser et Bibliothèque recevaient **toutes les publications au complet** : cartes du fil, fonds, fiche complète de chaque photo, décryptage. La page n'en affichait qu'une petite partie.

## Ce qui change

- **Explorer** reçoit seulement ce qu'il cherche et affiche : titre, résumé, idées, sources, le premier chiffre clé, et pour la photo l'image et son crédit.
- **Réviser** reçoit les cartes de révision, fabriquées au moment de la construction du site, au lieu des publications.
- **Bibliothèque** reçoit une ligne par publication : titre, rubrique, format, date, statut de vérification et nombre de sources.

Rien ne change à l'écran.

## Avant

| Page | HTML | JS | CSS | Total | Total gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| / | 53.8 Ko | 589.8 Ko | 64.4 Ko | 708.0 Ko | 205.6 Ko |
| /explorer/ | 348.0 Ko | 604.3 Ko | 64.4 Ko | 1016.7 Ko | 282.2 Ko |
| /reviser/ | 370.9 Ko | 600.0 Ko | 64.4 Ko | 1035.4 Ko | 283.5 Ko |
| /enregistres/ | 348.9 Ko | 600.6 Ko | 64.4 Ko | 1014.0 Ko | 281.1 Ko |
| /dossiers/cobalt-congolais/ | 63.6 Ko | 589.7 Ko | 64.4 Ko | 717.8 Ko | 206.4 Ko |

## Après

| Page | HTML | JS | CSS | Total | Total gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| / | 53.8 Ko | 589.6 Ko | 64.4 Ko | 707.8 Ko | 205.5 Ko |
| /explorer/ | 216.4 Ko | 604.3 Ko | 64.4 Ko | 885.1 Ko | 260.6 Ko |
| /reviser/ | 177.6 Ko | 594.1 Ko | 64.4 Ko | 836.2 Ko | 235.0 Ko |
| /enregistres/ | 47.3 Ko | 600.4 Ko | 64.4 Ko | 712.1 Ko | 211.3 Ko |
| /dossiers/cobalt-congolais/ | 63.6 Ko | 589.7 Ko | 64.4 Ko | 717.8 Ko | 206.4 Ko |

## Résultat

| Page | HTML avant | HTML après | Gain |
| --- | ---: | ---: | ---: |
| Explorer | 348,0 Ko | 216,4 Ko | −38 % |
| Réviser | 370,9 Ko | 177,6 Ko | −52 % |
| Bibliothèque | 348,9 Ko | 47,3 Ko | −86 % |

Le JavaScript commun (environ 590 Ko brut) est partagé par toutes les pages et mis en cache après la première visite. Il n'est pas traité ici.
