/**
 * Aperçus Netlify (Deploy Previews et branch deploys) : leur adresse contient
 * « -- » avant « .netlify.app » (ex. deploy-preview-12--mundiapptest.netlify.app).
 * Netlify y ajoute son outil de relecture (« Netlify Drawer ») en bas de l'écran :
 * on marque alors la page pour que la navigation lui laisse le coin bas-droit.
 * Le site principal et l'application installée ne sont pas concernés.
 */
export function isNetlifyPreviewHost(hostname: string): boolean {
  return /--[a-z0-9-]+\.netlify\.app$/i.test(hostname);
}

/** Script exécuté avant l'affichage (pas de saut visuel). Doit rester autonome. */
export const previewHostScript = `try{if(/--[a-z0-9-]+\\.netlify\\.app$/i.test(location.hostname))document.documentElement.setAttribute("data-netlify-preview","")}catch(e){}`;
