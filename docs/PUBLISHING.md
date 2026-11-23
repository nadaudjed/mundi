# Publication éditoriale MUNDI — version statique

## Pour une personne qui ne code pas
1. Ouvrir /atelier/ sur le site et remplir le formulaire, ou demander à Claude de préparer le contenu.
2. Télécharger le fichier .draft.json puis le donner à Claude Code.
3. Ouvrir réellement les sources et vérifier les affirmations, chiffres, dates, citations et droits des médias. Une IA ne peut pas approuver seule la publication.
4. Un responsable éditorial relit, corrige, approuve explicitement et renseigne son nom.
5. Claude ajoute la publication approuvée à content/publications.json et change son statut de draft à published ; créer une branche et une Pull Request.
6. Contrôler le build de Netlify Preview et valider avant fusion. Netlify reconstruit automatiquement les pages statiques.

## Contraintes
- Le formulaire /atelier/ est accessible sans authentification ; il n'a AUCUN accès à GitHub et ne peut PAS publier. Il exporte seulement un brouillon local sur l'ordinateur.
- Le JSON validé doit contenir : slug, title, summary, topic, publishedAt, updatedAt, status, reviewedBy, keyPoints (3), sections et sources (au moins 2 URLs HTTPS).
- Les vérifications automatisées sont **structurelles**. Deux liens ne prouvent ni la pertinence ni la vérité des affirmations.
- La page /actualites/ n'affiche que les objets marqués published ET correctement structurés.
- Les 12 récits de démonstration restent séparés sur les pages existantes.
- Ce flux convient à une petite rédaction, pas encore à la publication en temps réel. Un CMS avec authentification viendra plus tard.
