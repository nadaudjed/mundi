/**
 * Adresses Netlify (*.netlify.app : site de test, Deploy Previews, branch deploys).
 * Netlify y ajoute en bas de l'écran son bandeau « Powered by Netlify » ou son
 * outil de relecture (« Netlify Drawer ») : on marque alors la page pour que la
 * barre d'onglets passe au-dessus. Un futur nom de domaine propre n'est pas concerné.
 */
export function isNetlifyHost(hostname: string): boolean {
  return /\.netlify\.app$/i.test(hostname);
}

/** Script exécuté avant l'affichage (pas de saut visuel). Doit rester autonome. */
export const netlifyHostScript = `try{if(/\\.netlify\\.app$/i.test(location.hostname))document.documentElement.setAttribute("data-netlify-host","")}catch(e){}`;
