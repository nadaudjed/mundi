const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00Z`));
}

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « mardi 24 novembre 2026 » : la date d'une actualité, lisible d'un coup d'œil. */
export function formatLongDate(iso: string): string {
  return longDateFormatter.format(new Date(`${iso}T00:00:00Z`));
}

export function formatMinutes(minutes: number): string {
  return minutes <= 1 ? "1 min" : `${minutes} min`;
}

/** Normalise un texte pour la recherche : minuscules, sans accents. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
