/**
 * Tout ce que MUNDI garde dans le navigateur (localStorage), sur l'appareil du lecteur.
 * Rien de tout cela n'est envoyé à un serveur. La page /confidentialite/ affiche
 * cette liste ; un test vérifie que chaque clé « mundi:… » du code y figure.
 */
export const LOCAL_DATA: { key: string; what: string }[] = [
  { key: "mundi:bookmarks", what: "Les récits et publications que vous avez enregistrés (identifiant, titre, date d'enregistrement)." },
  { key: "mundi:topics:v1", what: "Les sujets choisis dans « Mes sujets », pour personnaliser l'ordre du fil." },
  { key: "mundi:revision:v1", what: "Votre progression dans « Réviser » : niveau atteint et date de la prochaine révision, pour chaque récit." },
  { key: "mundi:motion-paused", what: "Ancien réglage « pause des décors animés », qui n’est plus utilisé : les décors ne bougent plus. Effacé avec le reste." },
];
