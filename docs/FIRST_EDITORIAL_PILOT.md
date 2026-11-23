# Premier pilote éditorial MUNDI — du flux institutionnel au récit

Notre veille Eurostat a collecté 22 fiches candidates lors du premier test réel du 23 novembre 2026 (run GitHub Actions #45132998204). Une de ces pistes concerne les déchets textiles de l'UE en 2024.

**Dossier de travail :** `editorial/reviews/textile-2024/`.

Ce dossier contient :
- `draft.json` : première rédaction originale **non validée** et non publiée, avec statut `draft`, aucune date de publication MUNDI et aucun relecteur fictif ;
- `fact-check.md` : preuves, ambiguïtés statistiques, points à contrôler et proposition de récit immersif.

## Processus de publication

1. La rédaction ouvre le dossier, vérifie les sources et corrige le brouillon.
2. Le responsable humain valide **explicitement** la version finale.
3. Claude Code ou ChatGPT propose séparément une PR vers `content/publications.json` après approbation : cette PR **n'est pas auto-fusionnée**.
4. Tester et relire sur Netlify Preview avant toute fusion explicite.
5. Une fois fusionné, l'article vérifié apparaît dans MUNDI selon le système de Claude. Les versions de démonstration restent marquées.

Le fichier dans `editorial/reviews/` ne doit jamais être traité comme une publication réelle par `lib/editorial.ts` ou une source pour le fil `main`. Il sert uniquement de dossier d'atelier.

Il faudra également vérifier l'interprétation des données `env_wasgen` et `env_wastrt` directement auprès d'Eurostat et la précision juridique du texte avant mise en ligne. Aucun contenu n'est approuvé par la simple création de ce fichier.
