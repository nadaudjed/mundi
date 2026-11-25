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

/** Filet de sécurité : retire l'animation si sa fin n'a pas été signalée. */
export const INTRO_FALLBACK_MS = 15000;

/**
 * Script exécuté avant l'affichage (dans <head>) : décide de jouer l'animation et
 * pose html[data-intro] ; la retire quand l'animation du voile se termine
 * (événement animationend), et non après un délai fixe : sur un téléphone, la
 * page peut mettre plusieurs secondes à s'afficher, et un minuteur lancé dès ce
 * script coupait l'animation avant qu'on ait pu la voir. Pour la même raison,
 * l'animation reste en attente (data-intro="wait", écran nuit fixe) jusqu'à ce
 * que le navigateur affiche réellement la page (deux requestAnimationFrame),
 * puis démarre (data-intro="play"). Un toucher, un clic ou une touche la
 * raccourcit, mais pas pendant sa première seconde affichée.
 * `?intro=1` force l'animation (vérifications). Doit rester autonome.
 */
export const introScript = `try{(function(){var d=document.documentElement,K="${INTRO_KEY}",G=${INTRO_GAP_MS},t=0,s0=0,on=0;function last(){try{return Number(localStorage.getItem(K))||0}catch(y){return 0}}function seen(){try{localStorage.setItem(K,String(Date.now()))}catch(y){}}function end(){clearTimeout(t);d.removeAttribute("data-intro")}function shown(){var e=document.querySelector(".intro"),a=e&&e.getAnimations&&e.getAnimations()[0];return a&&a.currentTime!=null?a.currentTime:Date.now()-s0}function skip(){if(d.getAttribute("data-intro")==="play"&&shown()>1200){d.setAttribute("data-intro","skip");clearTimeout(t);t=setTimeout(end,800)}}function go(){if(d.getAttribute("data-intro")==="wait"){d.setAttribute("data-intro","play");s0=Date.now();clearTimeout(t);t=setTimeout(end,${INTRO_FALLBACK_MS})}}function play(){seen();d.removeAttribute("data-intro");void d.offsetWidth;d.setAttribute("data-intro","wait");clearTimeout(t);t=setTimeout(end,${INTRO_FALLBACK_MS + 10000});s0=Date.now();requestAnimationFrame(function(){requestAnimationFrame(go)});if(!on){on=1;["pointerdown","keydown","wheel"].forEach(function(k){addEventListener(k,skip,{passive:true})});document.addEventListener("animationend",function(e){var g=e.target;if(g&&g.classList&&g.classList.contains("intro")&&e.animationName==="intro-out")end()})}}function away(){var n=Date.now()-last();return !navigator.webdriver&&!(n>=0&&n<G)}if(/[?&]intro=1(&|$)/.test(location.search)||away())play();else seen();document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")seen();else if(away())play()});addEventListener("pagehide",seen);addEventListener("pageshow",function(e){if(e.persisted&&away())play()})})()}catch(x){}`;
