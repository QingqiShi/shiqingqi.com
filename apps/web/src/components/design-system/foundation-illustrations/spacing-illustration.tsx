/**
 * Spacing foundation-card illustration. Styling and animation live in
 * `spacing.css` under the `.dsi-spacing` namespace; this component is pure
 * geometry.
 *
 * A rem-based spacing scale drawn as seven rounded bars growing in height
 * left -> right (0.25 -> 4). Each bar carries a small value label on a gentle
 * diagonal, joined to its bar by a faint dashed leader; the row sits along the
 * bottom edge and bleeds to the right. At rest the bars are a dim neutral grey;
 * on hover a warm-gold bloom rises behind them and the labels and leaders warm.
 *
 * On hover the layers react to the pointer: the bar stack leans toward the
 * cursor, an ambient bloom behind it drifts a touch further, and a warm
 * highlight sweeps across the bar faces tracking where the pointer is.
 */
const BASELINE = 170;

const BARS = [
  { label: "0.25", x: 2, width: 24, height: 22, labelY: 116 },
  { label: "0.5", x: 38, width: 26, height: 34, labelY: 108 },
  { label: "1", x: 76, width: 28, height: 50, labelY: 96 },
  { label: "1.5", x: 116, width: 32, height: 68, labelY: 84 },
  { label: "2", x: 160, width: 38, height: 86, labelY: 70 },
  { label: "3", x: 210, width: 44, height: 108, labelY: 50 },
  { label: "4", x: 266, width: 54, height: 130, labelY: 30 },
];

export function SpacingIllustration() {
  return (
    <svg
      className="dsi-spacing"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Warm bloom that rises behind the taller bars on hover. */}
        <radialGradient id="dsi-spacing-sp-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))"
            stopOpacity="0.85"
          />
          <stop
            offset="55%"
            stopColor="color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 100%))"
            stopOpacity="0.26"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        {/* Bar face: a neutral dark panel that warms a touch on hover. */}
        <linearGradient id="dsi-spacing-sp-face" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="color-mix(in oklab, var(--sp-face-top), var(--ds-illo-hue) calc(var(--ds-illo) * 13%))"
          />
          <stop
            offset="100%"
            stopColor="color-mix(in oklab, var(--sp-face-bot), var(--ds-illo-hue) calc(var(--ds-illo) * 7%))"
          />
        </linearGradient>
        {/* Warm highlight that tracks the cursor across the bar faces. */}
        <radialGradient id="dsi-spacing-sp-spot" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.42"
          />
          <stop
            offset="48%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.14"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="sp-scene">
        {/* Bloom hugging the bottom-right where the tall bars stand. */}
        <g className="sp-bloom">
          <ellipse
            cx="228"
            cy="150"
            rx="140"
            ry="72"
            fill="url(#dsi-spacing-sp-glow)"
          />
        </g>

        {/* Dashed leaders joining each bar to its value label. */}
        <g className="sp-guides">
          {BARS.map((bar) => (
            <line
              key={bar.label}
              x1={bar.x + bar.width / 2}
              y1={bar.labelY + 6}
              x2={bar.x + bar.width / 2}
              y2={BASELINE}
            />
          ))}
        </g>

        {/* The spacing scale: rounded bars growing in height left -> right.
            The outer group parallaxes toward the cursor; the inner group rises
            from the baseline on hover. */}
        <g className="sp-bars">
          <g className="sp-rise">
            {BARS.map((bar) => (
              <rect
                key={bar.label}
                x={bar.x}
                y={BASELINE - bar.height}
                width={bar.width}
                height={bar.height}
                rx="4"
                fill="url(#dsi-spacing-sp-face)"
              />
            ))}
          </g>
        </g>

        {/* Warm highlight sweeping across the bar faces, tracking the cursor. */}
        <ellipse
          className="sp-spot"
          cx="180"
          cy="118"
          rx="104"
          ry="80"
          fill="url(#dsi-spacing-sp-spot)"
        />

        {/* Value labels on a gentle diagonal above the bars. */}
        <g className="sp-labels">
          {BARS.map((bar) => (
            <text key={bar.label} x={bar.x + bar.width / 2} y={bar.labelY}>
              {bar.label}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
}
