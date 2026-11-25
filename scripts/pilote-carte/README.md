# Carte du Shaba (pilote « Aujourd'hui »)

Fabrique `public/media/pilote/shaba-carte.svg`, une seule fois, hors du build du site.

Entrées (domaine public, Natural Earth) :
- `world-atlas@2.0.2` (`countries-50m.json` et `countries-110m.json`, npm) ;
- `ne_10m_admin_1_states_provinces.geojson` (dépôt GitHub nvkelso/natural-earth-vector), enregistré sous `adm1.geojson`.
  Sa province « Katanga » (découpage d'avant 2015) correspond au Shaba de l'époque Mobutu.

Dans un dossier de travail contenant `adm1.geojson`, avec `world-atlas` et `topojson-client@3.1.0` installés :

```
node 1-projeter.mjs && node 2-medaillon.mjs && node 3-dessiner.mjs
```

(à lancer depuis la racine du dépôt pour la dernière étape, qui écrit dans `public/`).
