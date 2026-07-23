/**
 * Elevation foundation-card illustration. Styling and
 * animation live in `elevation.css` under the `.dsi-elevation`
 * namespace; this component is pure geometry.
 *
 * Four glassy planes recede up and to the right, with the largest,
 * most opaque plane anchored at the bottom. A warm-gold pool of light
 * blooms under the front plane's bottom edge to read as elevation.
 */
export function ElevationIllustration() {
  return (
    <svg
      className="dsi-elevation"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Warm-gold floor pool: bright centre -> transparent edge. */}
        <radialGradient id="dsi-elevation-elGlowG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" className="gs0" />
          <stop offset="48%" className="gs1" />
          <stop offset="100%" className="gs2" />
        </radialGradient>
        {/* Ambient focal bloom behind the stack. */}
        <radialGradient id="dsi-elevation-elFocalG" cx="50%" cy="58%" r="55%">
          <stop offset="0%" className="fs0" />
          <stop offset="60%" className="fs1" />
          <stop offset="100%" className="fs2" />
        </radialGradient>
        {/* Top-lit glassy sheen on each plane surface. */}
        <linearGradient id="dsi-elevation-elSurfG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="us0" />
          <stop offset="100%" className="us1" />
        </linearGradient>
      </defs>

      {/* Ambient focal bloom, hugging the front plane; follows the cursor. */}
      <g className="focalFollow">
        <ellipse
          className="focal"
          cx="216"
          cy="140"
          rx="112"
          ry="86"
          fill="url(#dsi-elevation-elFocalG)"
        />
      </g>

      {/* Plane 4 — backmost, smallest, faintest; leans furthest on parallax. */}
      <g className="lift4">
        <g className="parallax parallax4">
          <rect
            className="pfill"
            x="207"
            y="57"
            width="108"
            height="52"
            rx="12"
            fill="url(#dsi-elevation-elSurfG)"
          />
          <rect
            className="pline"
            x="207"
            y="57"
            width="108"
            height="52"
            rx="12"
          />
        </g>
      </g>

      {/* Plane 3. */}
      <g className="lift3">
        <g className="parallax parallax3">
          <rect
            className="pfill"
            x="189"
            y="71"
            width="114"
            height="55"
            rx="12"
            fill="url(#dsi-elevation-elSurfG)"
          />
          <rect
            className="pline"
            x="189"
            y="71"
            width="114"
            height="55"
            rx="12"
          />
        </g>
      </g>

      {/* Plane 2. */}
      <g className="lift2">
        <g className="parallax parallax2">
          <rect
            className="pfill"
            x="171"
            y="85"
            width="120"
            height="58"
            rx="12"
            fill="url(#dsi-elevation-elSurfG)"
          />
          <rect
            className="pline"
            x="171"
            y="85"
            width="120"
            height="58"
            rx="12"
          />
        </g>
      </g>

      {/* Warm-gold floor pool under the front plane's bottom edge; tracks the
          cursor so the light reads as coming from the pointer. */}
      <g className="poolFollow">
        <ellipse
          className="pool"
          cx="216"
          cy="160"
          rx="80"
          ry="18"
          fill="url(#dsi-elevation-elGlowG)"
        />
      </g>

      {/* Plane 1 — front, largest, glassiest; anchors the stack, leans least. */}
      <g className="parallax parallax1">
        <rect
          className="pfill lead"
          x="153"
          y="99"
          width="126"
          height="61"
          rx="13"
          fill="url(#dsi-elevation-elSurfG)"
        />
        <rect
          className="pline lead"
          x="153"
          y="99"
          width="126"
          height="61"
          rx="13"
        />
      </g>
    </svg>
  );
}
