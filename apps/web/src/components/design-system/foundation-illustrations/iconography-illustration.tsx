/**
 * Iconography foundation-card illustration. Styling and animation live in
 * `iconography.css` under the `.dsi-iconography` namespace; this component is
 * pure geometry.
 *
 * A 3x3 grid of recognisable Phosphor-style outline icons (search, bell, heart /
 * gear, person, calendar / plus, toggle, arrow-square-out). The outline colour
 * crossfades ink -> hue on hover, and a soft warm spotlight follows the cursor
 * across the set — sweeping the icons like a flashlight. The toggle knob is the
 * focal element: it slides on and fills to cream as the card comes alive. Each
 * icon is drawn in a local box centred on the origin, then translated onto the
 * grid.
 */
export function IconographyIllustration() {
  return (
    <svg
      className="dsi-iconography"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Broad halo behind the whole cluster. */}
        <radialGradient id="dsi-iconography-ico-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.8"
          />
          <stop offset="45%" stopColor="var(--ds-illo-hue)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        {/* Tighter pool for the cursor-following spotlight — soft-edged so it
            reads as a physical light rather than a hard disc. */}
        <radialGradient
          id="dsi-iconography-spot-glow"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.85"
          />
          <stop
            offset="42%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.42"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* hue bloom behind the cluster (rest ink -> alive hue via opacity) */}
      <g className="illo-bloom">
        <circle
          cx="252"
          cy="100"
          r="72"
          fill="url(#dsi-iconography-ico-glow)"
        />
      </g>

      {/* Warm spotlight: anchored at the origin and translated onto the grid by
          the pointer, so it sweeps whichever icons the cursor is over. Sits
          under the strokes so they stay crisp on top. */}
      <g className="illo-spot">
        <circle cx="0" cy="0" r="44" fill="url(#dsi-iconography-spot-glow)" />
      </g>

      {/* 3x3 icon grid. Stroke crossfades ink -> hue through --ds-illo. */}
      <g
        className="illo-icons"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* row 1 */}
        <g transform="translate(213 62)">
          {/* search */}
          <circle cx="-2" cy="-2" r="6.2" />
          <line x1="2.4" y1="2.4" x2="7.4" y2="7.4" />
        </g>
        <g transform="translate(252 62)">
          {/* bell */}
          <path d="M -6 4 C -6 4 -4.4 2.4 -4.4 -1 A 4.4 4.4 0 0 1 4.4 -1 C 4.4 2.4 6 4 6 4 Z" />
          <path d="M -1.9 4 A 1.9 1.9 0 0 0 1.9 4" />
        </g>
        <g transform="translate(291 62)">
          {/* heart */}
          <path d="M 0 6 C -7.6 0.6 -6 -6 -2.4 -6 C -0.4 -6 0 -4.1 0 -4.1 C 0 -4.1 0.4 -6 2.4 -6 C 6 -6 7.6 0.6 0 6 Z" />
        </g>

        {/* row 2 */}
        <g transform="translate(213 101)">
          {/* gear */}
          <path d="M 7.6 0 L 4.62 1.91 L 5.37 5.37 L 1.91 4.62 L 0 7.6 L -1.91 4.62 L -5.37 5.37 L -4.62 1.91 L -7.6 0 L -4.62 -1.91 L -5.37 -5.37 L -1.91 -4.62 L 0 -7.6 L 1.91 -4.62 L 5.37 -5.37 L 4.62 -1.91 Z" />
          <circle cx="0" cy="0" r="2.6" />
        </g>
        <g transform="translate(252 101)">
          {/* person */}
          <circle cx="0" cy="-3.2" r="3.3" />
          <path d="M -5.6 6.2 C -5.6 1.7 -3 0.2 0 0.2 C 3 0.2 5.6 1.7 5.6 6.2" />
        </g>
        <g transform="translate(291 101)">
          {/* calendar */}
          <rect x="-6.5" y="-5" width="13" height="11.5" rx="2" />
          <line x1="-6.5" y1="-1" x2="6.5" y2="-1" />
          <line x1="-3.2" y1="-7.2" x2="-3.2" y2="-3" />
          <line x1="3.2" y1="-7.2" x2="3.2" y2="-3" />
        </g>

        {/* row 3 */}
        <g transform="translate(213 140)">
          {/* plus-circle */}
          <circle cx="0" cy="0" r="7.2" />
          <line x1="0" y1="-3.6" x2="0" y2="3.6" />
          <line x1="-3.6" y1="0" x2="3.6" y2="0" />
        </g>
        <g transform="translate(252 140)">
          {/* toggle switch — focal: knob slides on + fills to cream via --ds-illo */}
          <rect
            className="illo-toggle-track"
            x="-8.5"
            y="-4.8"
            width="17"
            height="9.6"
            rx="4.8"
          />
          <circle className="illo-toggle-knob" cx="3.6" cy="0" r="3" />
        </g>
        <g transform="translate(291 140)">
          {/* arrow-square-out */}
          <path d="M 6 0.5 L 6 6 L -6 6 L -6 -6 L -0.5 -6" />
          <line x1="-0.5" y1="0.5" x2="6.5" y2="-6.5" />
          <path d="M 1.8 -6.5 L 6.5 -6.5 L 6.5 -1.8" />
        </g>
      </g>
    </svg>
  );
}
