/**
 * Espaces insécables du français : « : », « ? », « ! », « ; » et les guillemets
 * ne partent jamais seuls en début de ligne.
 */
export function frenchSpacing(text: string): string {
  return text.replace(/ ([:;?!»])/g, " $1").replace(/« /g, "« ");
}
