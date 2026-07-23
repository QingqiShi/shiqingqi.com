/**
 * Typography foundation-card illustration. Styling and animation live in
 * `typography.css` under the `.dsi-typography` namespace; this component is
 * pure geometry.
 *
 * A large serif "Aa" with a metallic sheen, sat against a type-scale ruler
 * (72 / 48 / 24 / 16) whose guide lines run across the letterforms. At rest the
 * glyph is a dim silver; on hover it brightens to a warm metallic and a shimmer
 * sweeps the baseline with a blinking caret.
 */
export function TypographyIllustration() {
  return (
    <svg
      className="dsi-typography"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Warm ambient glow behind the glyph. */}
        <radialGradient id="dsi-typography-ty-orb" cx="50%" cy="54%" r="58%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.8"
          />
          <stop offset="55%" stopColor="var(--ds-illo-hue)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        {/* Metallic fill: silver with a warm mid-band. Theme-aware so the glyph
            keeps contrast on the light (cream) surface as brushed pewter, and
            reads as bright silver on the dark surface. */}
        <linearGradient
          id="dsi-typography-ty-metal"
          x1="0"
          y1="0"
          x2="0.15"
          y2="1"
        >
          <stop
            offset="0%"
            style={{ stopColor: "light-dark(#8f8b82, #f1efe9)" }}
          />
          <stop
            offset="34%"
            style={{ stopColor: "light-dark(#6c6960, #cbc8bf)" }}
          />
          <stop
            offset="56%"
            style={{ stopColor: "light-dark(#9c7c46, #dcc59a)" }}
          />
          <stop
            offset="78%"
            style={{ stopColor: "light-dark(#5f5b52, #b3aea3)" }}
          />
          <stop
            offset="100%"
            style={{ stopColor: "light-dark(#403d37, #928e84)" }}
          />
        </linearGradient>
        <linearGradient
          id="dsi-typography-ty-sweep"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter
          id="dsi-typography-ty-blur"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Ambient field glow behind the glyph. */}
      <ellipse
        className="ty-orb"
        cx="258"
        cy="120"
        rx="86"
        ry="62"
        fill="url(#dsi-typography-ty-orb)"
      />

      {/* Type-scale ruler: guide lines + size labels, drawn under the glyph. */}
      <g className="ty-rule-set">
        <g className="ty-rule">
          <line x1="188" y1="76" x2="318" y2="76" />
          <line x1="188" y1="100" x2="318" y2="100" />
          <line x1="188" y1="140" x2="318" y2="140" />
          <line x1="188" y1="153" x2="318" y2="153" />
        </g>
        <g className="ty-nums">
          <text x="180" y="76">
            72
          </text>
          <text x="180" y="100">
            48
          </text>
          <text x="180" y="140">
            24
          </text>
          <text x="180" y="153">
            16
          </text>
        </g>
      </g>

      {/* The letterform: soft glow + crisp glyph, rest silver -> alive metallic. */}
      <g className="ty-letters">
        <text
          className="ty-glyph ty-glow"
          x="194"
          y="156"
          filter="url(#dsi-typography-ty-blur)"
          fill="var(--ds-illo-hue-soft)"
        >
          Aa
        </text>
        <text className="ty-glyph ty-ink" x="194" y="156" fill="#7f7d77">
          Aa
        </text>
        <text
          className="ty-glyph ty-metal"
          x="194"
          y="156"
          fill="url(#dsi-typography-ty-metal)"
        >
          Aa
        </text>
      </g>

      {/* Shimmer running along the baseline on hover. */}
      <g className="ty-shimmer-wrap">
        <rect
          className="ty-shimmer"
          x="190"
          y="150"
          width="76"
          height="6"
          rx="3"
          fill="url(#dsi-typography-ty-sweep)"
        />
      </g>

      {/* Blinking caret just past the glyph, baseline to cap height. */}
      <g className="ty-caret">
        <line className="ty-caret-blink" x1="315" y1="156" x2="315" y2="74" />
      </g>
    </svg>
  );
}
