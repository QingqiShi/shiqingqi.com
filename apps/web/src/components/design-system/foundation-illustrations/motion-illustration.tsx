/**
 * Motion foundation-card illustration. Styling and
 * animation live in `motion.css` under the `.dsi-motion`
 * namespace; this component is pure geometry.
 */
export function MotionIllustration() {
  return (
    <svg
      className="dsi-motion"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-motion-mo-bloom-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.8" />
          <stop offset="55%" stopColor="var(--ds-illo-ink)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-motion-mo-bloom-hue" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.42"
          />
          <stop offset="40%" stopColor="var(--ds-illo-hue)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-motion-mo-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop
            offset="34%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.95"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient corner wash */}
      <g>
        <circle
          className="mo-bloom-ink"
          cx="262"
          cy="112"
          r="78"
          fill="url(#dsi-motion-mo-bloom-ink)"
        />
        <circle
          className="mo-bloom-hue"
          cx="270"
          cy="118"
          r="62"
          fill="url(#dsi-motion-mo-bloom-hue)"
        />
      </g>

      {/* Faint square guide grid */}
      <g className="mo-grid">
        <path d="M180,60 L180,150" />
        <path d="M210,60 L210,150" />
        <path d="M240,60 L240,150" />
        <path d="M270,60 L270,150" />
        <path d="M300,60 L300,150" />
        <path d="M180,60 L300,60" />
        <path d="M180,90 L300,90" />
        <path d="M180,120 L300,120" />
        <path d="M180,150 L300,150" />
      </g>

      {/* Secondary easing reference (dashed curve bowing below the main curve) */}
      <path className="mo-linear" d="M210,150 C265,150 288,112 300,60" />

      {/* Primary easing curve (ease-in-out cubic bezier) */}
      <path
        className="mo-curve-glow-wide"
        d="M210,150 C258,150 252,60 300,60"
      />
      <path className="mo-curve-glow" d="M210,150 C258,150 252,60 300,60" />
      <path className="mo-curve-ink" d="M210,150 C258,150 252,60 300,60" />
      <path className="mo-curve-hue" d="M210,150 C258,150 252,60 300,60" />

      {/* Endpoint glow haloes: the start brightens as the cursor leans left, the
          end as it leans right (see .mo-endpoint-start / -end in motion.css). */}
      <circle
        className="mo-endpoint-glow mo-endpoint-start"
        cx="210"
        cy="150"
        r="12"
        fill="url(#dsi-motion-mo-orb)"
      />
      <circle
        className="mo-endpoint-glow mo-endpoint-end"
        cx="300"
        cy="60"
        r="12"
        fill="url(#dsi-motion-mo-orb)"
      />

      {/* Resting endpoint dots (dim at rest) */}
      <circle className="mo-endpoint-rest" cx="210" cy="150" r="4" />
      <circle className="mo-endpoint-rest" cx="300" cy="60" r="4" />

      {/* Live endpoint cores (bloom warm/white on hover) */}
      <circle className="mo-endpoint-live" cx="210" cy="150" r="3.4" />
      <circle className="mo-endpoint-live" cx="300" cy="60" r="3.4" />

      {/* Dot that scrubs the curve under the cursor (offset-path in motion.css) */}
      <g className="mo-comet">
        <circle className="mo-g4" r="2.4" fill="url(#dsi-motion-mo-orb)" />
        <circle className="mo-g3" r="3" fill="url(#dsi-motion-mo-orb)" />
        <circle className="mo-g2" r="3.6" fill="url(#dsi-motion-mo-orb)" />
        <circle className="mo-g1" r="4.4" fill="url(#dsi-motion-mo-orb)" />
        <circle className="mo-head" r="5.6" fill="url(#dsi-motion-mo-orb)" />
      </g>
    </svg>
  );
}
