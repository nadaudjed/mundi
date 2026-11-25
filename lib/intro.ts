/**
 * Animation d'entrée (logo MUNDI) : jouée à l'arrivée sur le site, c'est-à-dire
 * au chargement d'une page ou au retour dans l'onglet ou l'application après au
 * moins 30 minutes d'absence (Safari et l'application iPhone reprennent souvent
 * la page sans la recharger). Jamais lors des navigations internes.
 * Si l'appareil demande moins d'animations : version calme (logo fixe qui s'efface).
 * Le repère « mundi:intro » (localStorage) garde l'heure de la dernière visite.
 */
export const INTRO_KEY = "mundi:intro";
/** Durée totale de l'animation, en millisecondes (doit correspondre à globals.css). */
export const INTRO_MS = 5000;
/** Absence minimale avant de rejouer l'animation. */
export const INTRO_GAP_MS = 30 * 60 * 1000;

/**
 * Script exécuté avant l'affichage (dans <head>) : décide de jouer l'animation et
 * pose html[data-intro] ; la retire à la fin. Un toucher, un clic ou une touche
 * la raccourcit, mais pas pendant la première seconde (un geste involontaire à
 * l'ouverture la coupait aussitôt). `?intro=1` force l'animation (vérifications). Doit rester autonome.
 */
export const introScript = `try{(function(){var d=document.documentElement,K="${INTRO_KEY}",G=${INTRO_GAP_MS},t=0,s0=0,on=0;function last(){try{return Number(localStorage.getItem(K))||0}catch(y){return 0}}function seen(){try{localStorage.setItem(K,String(Date.now()))}catch(y){}}function end(){d.removeAttribute("data-intro")}function skip(){if(d.getAttribute("data-intro")==="play"&&Date.now()-s0>1200){d.setAttribute("data-intro","skip");clearTimeout(t);t=setTimeout(end,260)}}function play(){seen();d.removeAttribute("data-intro");void d.offsetWidth;d.setAttribute("data-intro","play");clearTimeout(t);t=setTimeout(end,${INTRO_MS + 50});s0=Date.now();if(!on){on=1;["pointerdown","keydown","wheel"].forEach(function(k){addEventListener(k,skip,{passive:true})})}}function away(){var n=Date.now()-last();return !navigator.webdriver&&!(n>=0&&n<G)}if(/[?&]intro=1(&|$)/.test(location.search)||away())play();else seen();document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")seen();else if(away())play()});addEventListener("pagehide",seen);addEventListener("pageshow",function(e){if(e.persisted&&away())play()})})()}catch(x){}`;
