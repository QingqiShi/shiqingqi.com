import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { border, color } from "@tuja/ui/tokens.stylex";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";
import { squirclePath } from "./squircle-path.ts";

const FIELD = { x: 112, y: 16, width: 240, height: 192 };
/** How far each traced line sits outside its card. */
const TRACE_OFFSET = 7;

const CARDS = [
  { x: 140, y: 88, width: 100, height: 62, radius: 18 },
  { x: 264, y: 116, width: 46, height: 40, radius: 16 },
];

const cardPaths = CARDS.map(({ x, y, width, height, radius }) =>
  squirclePath(x, y, width, height, radius),
);
const tracePaths = CARDS.map(({ x, y, width, height, radius }) =>
  squirclePath(
    x - TRACE_OFFSET,
    y - TRACE_OFFSET,
    width + 2 * TRACE_OFFSET,
    height + 2 * TRACE_OFFSET,
    radius + TRACE_OFFSET,
  ),
);

/**
 * Effect layer foundation-card illustration: a faint dot field around two
 * cards, standing for what the effect layer draws, with a line
 * traced around each card the way the layer measures it — grey at rest, warm
 * gold on hover, when the field also drifts the other way from the cards.
 */
export function EffectLayerIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dsi-effect-layer-dots"
          x="0"
          y="0"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="5" cy="5" r="0.9" fill="var(--ds-illo-ink)" />
        </pattern>
        <radialGradient id="dsi-effect-layer-fade" cx="62%" cy="58%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id="dsi-effect-layer-fieldMask">
          <rect {...FIELD} fill="url(#dsi-effect-layer-fade)" />
        </mask>
      </defs>

      <g mask="url(#dsi-effect-layer-fieldMask)">
        <rect
          css={styles.field}
          {...FIELD}
          fill="url(#dsi-effect-layer-dots)"
        />
      </g>

      <g css={styles.lean} fill="none" strokeWidth="1.6">
        {tracePaths.map((path) => (
          <g key={path}>
            <path css={styles.traceRest} d={path} />
            <path css={styles.traceAlive} d={path} />
          </g>
        ))}
      </g>

      <g css={styles.lean}>
        {cardPaths.map((path) => (
          <path key={path} css={styles.card} d={path} />
        ))}
      </g>
    </svg>
  );
}

const styles = stylex.create({
  field: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * -6px), calc(var(--ds-illo-my) * -4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  lean: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 4px), calc(var(--ds-illo-my) * 3px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  card: {
    fill: color.bgSurfaceRaised,
    stroke: color.border,
    strokeWidth: border.size_1,
  },
  traceRest: {
    stroke: "var(--ds-illo-ink)",
    strokeDasharray: "5 5",
    opacity: {
      default: 0.7,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0,
    },
    transition: "opacity 500ms ease",
  },
  traceAlive: {
    stroke: "var(--ds-illo-hue)",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transition: "opacity 560ms ease",
  },
});
