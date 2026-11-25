/**
 * Netlify ajoute un commentaire HTML (« This site is hosted on Netlify… ») dans
 * le <head> des pages servies. React ne l'attend pas : l'hydratation échoue
 * (erreur React n° 418) et toute la page est reconstruite dans le navigateur,
 * ce qui efface au passage l'animation d'entrée et le thème choisi, environ une
 * seconde après l'ouverture. Ce script, exécuté avant React, retire du <head>
 * ces commentaires et le retour à la ligne qui les accompagne (React n'y place
 * ni repère ni texte). Doit rester autonome.
 */
export const headCleanScript = `try{for(var n=document.head.firstChild,m;n;n=m){m=n.nextSibling;if(n.nodeType===8||n.nodeType===3)n.remove()}}catch(e){}`;
