/**
 * Écran d'entrée : le globe MUNDI se dessine, le point rouge brique apparaît,
 * puis le nom et « Comprendre le monde », et l'écran s'efface sur la page (environ 3 s). Version calme
 * (logo fixe, simple fondu) si l'appareil demande moins d'animations.
 * Rendu dans le HTML statique mais masqué ; seul html[data-intro] (posé par
 * lib/intro.ts avant l'affichage) le fait apparaître. Purement décoratif.
 */
export function IntroSplash() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-inner">
        <svg viewBox="0 0 32 32" className="intro-mark">
          <circle className="intro-globe" cx="16" cy="16" r="13" pathLength={1} />
          <ellipse className="intro-meridian" cx="16" cy="16" rx="6" ry="13" />
          <path className="intro-equator" d="M3.5 16h25" pathLength={1} />
          <circle className="intro-dot" cx="23.5" cy="8.5" r="2.6" />
        </svg>
        <span className="intro-word">MUNDI</span>
        <span className="intro-tagline">Comprendre le monde</span>
      </div>
    </div>
  );
}
