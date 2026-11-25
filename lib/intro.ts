/**
 * Animation d'entrée (logo MUNDI) : jouée une seule fois par onglet, au premier
 * chargement d'une page du site. Jamais lors des navigations internes (la mise en
 * page ne se recharge pas), ni si l'appareil demande moins d'animations.
 * Le repère « mundi:intro » est gardé en sessionStorage : effacé à la fermeture de l'onglet.
 */
export const INTRO_KEY = "mundi:intro";
/** Durée totale de l'animation, en millisecondes (doit correspondre à globals.css). */
export const INTRO_MS = 1500;

/**
 * Script exécuté avant l'affichage (dans <head>) : décide de jouer l'animation et
 * pose html[data-intro] ; la retire à la fin. Un toucher, un clic ou une touche
 * la raccourcit. `?intro=1` force l'animation (vérifications). Doit rester autonome.
 */
export const introScript = `try{var d=document.documentElement,f=/[?&]intro=1(&|$)/.test(location.search);if(f||(!navigator.webdriver&&!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)){sessionStorage.setItem("${INTRO_KEY}","1");d.setAttribute("data-intro","play");var e=function(){d.removeAttribute("data-intro")},s=function(){if(d.getAttribute("data-intro")==="play"){d.setAttribute("data-intro","skip");setTimeout(e,260)}};setTimeout(e,${INTRO_MS + 50});["pointerdown","keydown","wheel"].forEach(function(n){addEventListener(n,s,{once:true,passive:true})})}}catch(x){}`;
