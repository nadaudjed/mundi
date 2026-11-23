# MUNDI — Contrôle quotidien du site en production

Le workflow `MUNDI — Netlify production smoke test` visite le **domaine principal**
`https://mundiapptest.netlify.app` : la page d'accueil, la liste des actualités
et les trois derniers articles publiés dans `content/publications.json`.
Il ne se contente pas de la réussite des builds GitHub ou des Deploy Previews.

Il attend si nécessaire un peu après la fusion (six tentatives), publie un
résumé dans GitHub Actions et garde un rapport JSON téléchargeable pendant
14 jours. Il s'exécute à 12:15 UTC chaque jour (13:15 à Paris en hiver),
est déclenchable manuellement et suit les pushes modifiant le catalogue
public ou son propre code.

**Limites :** il contrôle la disponibilité HTTP et la présence du contenu
attendu, pas l'exactitude des articles, les droits des médias, ni une vraie
séance iPhone/Android. Un résultat rouge doit être corrigé avant de
considérer le déploiement opérationnel. Il ne publie rien et n'a pas
accès aux clés Anthropic ou Netlify.
