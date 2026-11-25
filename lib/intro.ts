/**
 * Animation d'entrée (logo MUNDI) : jouée à l'arrivée sur le site, puis plus
 * pendant 30 minutes, même si l'onglet ou l'application est rouvert. Jamais lors
 * des navigations internes (la mise en page ne se recharge pas).
 * Si l'appareil demande moins d'animations : version calme (logo fixe qui s'efface).
 * Le repère « mundi:intro » (localStorage) garde l'heure du dernier affichage.
 */
export const INTRO_KEY = "mundi:intro";
/** Durée totale de l'animation, en millisecondes (doit correspondre à globals.css). */
export const INTRO_MS = 3600;
/** Délai avant de rejouer l'animation à une nouvelle visite. */
export const INTRO_GAP_MS = 30 * 60 * 1000;

/**
 * Script exécuté avant l'affichage (dans <head>) : décide de jouer l'animation et
 * pose html[data-intro] ; la retire à la fin. Un toucher, un clic ou une touche
 * la raccourcit. `?intro=1` force l'animation (vérifications). Doit rester autonome.
 */
export const introScript = `try{var d=document.documentElement,n=Date.now(),f=/[?&]intro=1(&|$)/.test(location.search),l=0;try{l=Number(localStorage.getItem("${INTRO_KEY}"))||0}catch(y){}if(f||(!navigator.webdriver&&!(n-l>=0&&n-l<${INTRO_GAP_MS}))){try{localStorage.setItem("${INTRO_KEY}",String(n))}catch(y){}d.setAttribute("data-intro","play");var e=function(){d.removeAttribute("data-intro")},s=function(){if(d.getAttribute("data-intro")==="play"){d.setAttribute("data-intro","skip");setTimeout(e,260)}};setTimeout(e,${INTRO_MS + 50});["pointerdown","keydown","wheel"].forEach(function(k){addEventListener(k,s,{once:true,passive:true})})}}catch(x){}`;
