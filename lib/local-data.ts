/**
 * Tout ce que MUNDI garde dans le navigateur (localStorage), sur l'appareil du lecteur.
 * Rien de tout cela n'est envoyé à un serveur. La page /confidentialite/ affiche
 * cette liste ; un test vérifie que chaque clé « mundi:… » du code y figure.
 */
export const LOCAL_DATA: { key: string; what: string }[] = [
  { key: "mundi:bookmarks", what: "Les publications que vous avez enregistrées (identifiant, titre, date d'enregistrement)." },
  { key: "mundi:topics:v1", what: "Les sujets choisis dans « Mes sujets », pour personnaliser l'ordre du fil." },
  { key: "mundi:revision:v1", what: "Votre progression dans « Réviser » : niveau atteint et date de la prochaine révision, pour chaque carte mémoire." },
  { key: "mundi:theme", what: "Le thème choisi avec le bouton clair / sombre, s’il diffère du réglage de l’appareil." },
  { key: "mundi:focus-search", what: "Repère temporaire (sessionStorage) posé par le raccourci / ou Ctrl+K pour placer le curseur dans la recherche ; effacé aussitôt utilisé." },
  { key: "mundi:feed-position", what: "L’écran du Fil où vous étiez (sessionStorage), pour y revenir avec le bouton Retour ; effacé à la fermeture de l’onglet." },
  { key: "mundi:feed-seed", what: "Le tirage qui mélange un peu l’ordre du Fil (sessionStorage), pour garder le même ordre dans cet onglet ; effacé à sa fermeture." },
  { key: "mundi:intro", what: "L’heure de votre première visite, pour ne jouer l’animation d’entrée qu’une seule fois." },
  { key: "mundi:motion-paused", what: "Ancien réglage « pause des décors animés », qui n’est plus utilisé : les décors ne bougent plus. Effacé avec le reste." },
];
