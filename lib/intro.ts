/**
 * Animation d'entrée (logo MUNDI), refonte #113 : environ 5 s, jamais bloquante.
 * - Jouée une seule fois, à la première visite de l'accueil (« / »). Jamais sur un
 *   lien direct vers un article ou une autre page, jamais lors des navigations
 *   internes, et plus rejouée après une absence.
 * - Le moindre toucher, clic, défilement ou touche la coupe aussitôt : les commandes
 *   sont accessibles tout de suite.
 * - Si l'appareil demande moins d'animations : version calme (logo fixe qui s'efface).
 * Le repère « mundi:intro:v2 » (localStorage) garde l'heure de la première visite.
 */
// « :v2 » : l'animation revient en version 5 s (demande de Jacques), chacun la revoit une fois.
// L'ancien repère (sans « :v2 ») est effacé au passage.
export const INTRO_KEY = "mundi:intro:v2";
/** Filet de sécurité : retire l'animation si sa fin n'a pas été signalée. */
export const INTRO_FALLBACK_MS = 15000;

/**
 * Script exécuté avant l'affichage (dans <head>) : décide de jouer l'animation et
 * pose html[data-intro] ; la retire quand l'animation du voile se termine
 * (événement animationend), et non après un délai fixe (sur un téléphone, la page
 * peut mettre plusieurs secondes à s'afficher). L'animation reste en attente
 * (data-intro="wait", écran nuit fixe) jusqu'à ce que le navigateur affiche
 * réellement la page (deux requestAnimationFrame), puis démarre (data-intro="play").
 * `?intro=1` force l'animation (vérifications). Doit rester autonome.
 */
export const introScript = `try{(function(){var d=document.documentElement,K="${INTRO_KEY}",t=0;function seen(){try{return !!localStorage.getItem(K)}catch(y){return true}}function mark(){try{localStorage.setItem(K,String(Date.now()));localStorage.removeItem(K.slice(0,-3))}catch(y){}}function end(){clearTimeout(t);d.removeAttribute("data-intro")}function skip(){var s=d.getAttribute("data-intro");if(s==="play"||s==="wait"){d.setAttribute("data-intro","skip");clearTimeout(t);t=setTimeout(end,300)}}function go(){if(d.getAttribute("data-intro")==="wait"){d.setAttribute("data-intro","play");clearTimeout(t);t=setTimeout(end,${INTRO_FALLBACK_MS})}}var force=/[?&]intro=1(&|$)/.test(location.search),home=location.pathname==="/";if(force||(home&&!navigator.webdriver&&!seen())){mark();d.setAttribute("data-intro","wait");t=setTimeout(end,${INTRO_FALLBACK_MS + 10000});requestAnimationFrame(function(){requestAnimationFrame(go)});["pointerdown","keydown","wheel","touchstart","scroll"].forEach(function(k){addEventListener(k,skip,{passive:true,capture:true})});document.addEventListener("animationend",function(e){var g=e.target;if(g&&g.classList&&g.classList.contains("intro")&&e.animationName==="intro-out")end()})}else if(home&&!seen())mark()})()}catch(x){}`;
