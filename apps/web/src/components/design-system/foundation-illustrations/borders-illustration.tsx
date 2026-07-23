/**
 * Borders foundation-card illustration. Styling and pointer-reactivity live in
 * `borders.css` under the `.dsi-borders` namespace; this component is pure
 * geometry.
 *
 * A stack of concentric rounded frames sharing one bottom-right corner and
 * bleeding off the right and bottom edges. Stepping inward the corner radius
 * shrinks (the corner-radius scale) while the stroke treatment varies — a thin
 * outer keyline, a dashed frame whose left edge falls as a long dashed line, a
 * bright accent frame, quieter grey frames, and a small dark rounded rect at
 * the core (the border-width scale). At rest the frames read as dim monochrome
 * greys; on hover the two accent frames warm to gold and a soft bloom glows in.
 *
 * On hover the frames react to the pointer: each ring (`b-ring-1`..`b-ring-6`)
 * leans toward the cursor by a magnitude that grows with nesting, so the flat
 * nest pulls apart into layered depth, and a warm bloom trails the cursor so
 * the gold accents catch light where the pointer sits.
 */
export function BordersIllustration() {
  return (
    <svg
      className="dsi-borders"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Warm amber bloom behind the nested corner (alive). */}
        <radialGradient id="dsi-borders-hue" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.72"
          />
          <stop offset="45%" stopColor="var(--ds-illo-hue)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        {/* Resting monochrome glow. */}
        <radialGradient id="dsi-borders-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Resting grey glow, fades out as the card comes alive. */}
      <circle
        className="b-ink-glow"
        cx="300"
        cy="150"
        r="96"
        fill="url(#dsi-borders-ink)"
      />

      {/* Amber bloom: intensifies on hover and trails the cursor. */}
      <circle
        className="b-bloom"
        cx="298"
        cy="146"
        r="108"
        fill="url(#dsi-borders-hue)"
      />

      {/* The nest of frames — leans and parallaxes toward the cursor as a body. */}
      <g className="b-frames">
        {/* Small dark rounded rect at the core (drawn first so keylines sit over
            its edge). Reads as a darker inset patch in both themes. Moves with
            the core keyline (ring-6) so the corner patch stays coherent. */}
        <rect
          className="b-core-fill b-ring-6"
          x="298"
          y="140"
          width="90"
          height="96"
          rx="15"
          fill="rgb(0 0 0 / 0.4)"
        />

        {/* ============ ALWAYS-GREY FRAMES ============
            Dashed frame, two quiet grey frames, and the core's keyline. These
            stay monochrome in both states; only the accent frames warm to gold. */}
        <g
          className="b-grey"
          fill="none"
          stroke="var(--ds-illo-ink)"
          strokeLinejoin="round"
        >
          {/* Dashed frame — its left edge falls as a long dashed line. */}
          <rect
            className="b-ring-2"
            x="182"
            y="58"
            width="206"
            height="178"
            rx="46"
            strokeWidth="1.4"
            strokeDasharray="6 7"
          />
          <rect
            className="b-ring-4"
            x="244"
            y="104"
            width="144"
            height="132"
            rx="30"
            strokeWidth="1.6"
          />
          <rect
            className="b-ring-5"
            x="272"
            y="124"
            width="116"
            height="112"
            rx="23"
            strokeWidth="1.6"
          />
          <rect
            className="b-ring-6"
            x="298"
            y="140"
            width="90"
            height="96"
            rx="15"
            strokeWidth="1.5"
          />
        </g>

        {/* ============ ACCENT FRAMES — grey at rest ============ */}
        <g
          className="b-accent-rest"
          fill="none"
          stroke="var(--ds-illo-ink)"
          strokeLinejoin="round"
        >
          <rect
            className="b-ring-1"
            x="150"
            y="34"
            width="238"
            height="202"
            rx="54"
            strokeWidth="1.3"
          />
          <rect
            className="b-ring-3"
            x="214"
            y="82"
            width="174"
            height="154"
            rx="38"
            strokeWidth="2.6"
          />
        </g>

        {/* ============ ACCENT FRAMES — gold on hover ============ */}
        <g className="b-accent-alive" fill="none" strokeLinejoin="round">
          <rect
            className="b-ring-1"
            x="150"
            y="34"
            width="238"
            height="202"
            rx="54"
            stroke="var(--ds-illo-hue-soft)"
            strokeWidth="1.3"
          />
          <rect
            className="b-ring-3"
            x="214"
            y="82"
            width="174"
            height="154"
            rx="38"
            stroke="var(--ds-illo-hue)"
            strokeWidth="2.6"
          />
        </g>
      </g>
    </svg>
  );
}
