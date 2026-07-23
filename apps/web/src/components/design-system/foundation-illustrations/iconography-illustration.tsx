import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Iconography foundation-card illustration. A 3x3 grid of recognisable
 * Phosphor-style outline icons (search, bell, heart / gear, person, calendar /
 * plus, toggle, arrow-square-out). The outline colour crossfades ink -> hue on
 * hover, and a soft warm spotlight follows the cursor across the set — sweeping
 * the icons like a flashlight. The toggle knob is the focal element: it slides
 * on and fills to cream as the card comes alive. Each icon is drawn in a local
 * box centred on the origin, then translated onto the grid.
 *
 * Styling is StyleX, applied per SVG element via the `css` prop. The rest ->
 * alive bloom keys off the tile's own state with `stylex.when.ancestor(...)`
 * (the tile carries `illoMarker`), so each element transitions its own colour /
 * opacity between the two states — no shared aliveness variable. Continuous
 * pointer response still reads the inherited pointer vars: centred
 * `--ds-illo-mx` / `--ds-illo-my` for the parallax lean, and grid-mapped
 * `--ds-illo-px` / `--ds-illo-py` for the cursor-following spotlight. The base
 * palette tokens come from `illoBase`.
 */
export function IconographyIllustration() {
  return (
    <svg
      css={illoBase.svg}
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
      <g css={styles.bloom}>
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
      <g css={styles.spot}>
        <circle cx="0" cy="0" r="44" fill="url(#dsi-iconography-spot-glow)" />
      </g>

      {/* 3x3 icon grid. Stroke crossfades ink -> hue on hover. */}
      <g
        css={styles.icons}
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
          {/* toggle switch — focal: knob slides on + fills to cream on hover */}
          <rect x="-8.5" y="-4.8" width="17" height="9.6" rx="4.8" />
          <circle css={styles.toggleKnob} cx="3.6" cy="0" r="3" />
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

const styles = stylex.create({
  // Broad warm halo behind the cluster: rest ink -> alive hue via opacity. No
  // ambient loop — it simply blooms as the card comes alive. Frozen under
  // reduced motion; it still fades in via opacity.
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.72,
    },
    transformBox: "view-box",
    transformOrigin: "252px 100px",
    transform: {
      default: "scale(0.82)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "scale(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 520ms cubic-bezier(0.32, 0.72, 0, 1), transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Cursor-following spotlight: a soft warm pool that tracks the pointer across
  // the card, mapped onto the icon grid so it sweeps the icons like a flashlight.
  // Anchored at the origin and translated to the pointer position (px/py map the
  // full card onto the grid's bounds), so px=0 lights the left column and px=1
  // the right; likewise top -> bottom. Under reduced motion it parks on the grid
  // centre with no pointer response.
  spot: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(210px + var(--ds-illo-px, 0.5) * 82px), calc(60px + var(--ds-illo-py, 0.5) * 80px))",
      [motionConstants.REDUCED_MOTION]: "translate(251px, 100px)",
    },
    transition: {
      default:
        "opacity 420ms cubic-bezier(0.32, 0.72, 0, 1), transform 200ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // 3x3 icon grid. Stroke crossfades ink -> hue on hover. A hair of parallax
  // toward the cursor gives the set some life; settles to centre at rest
  // (mx/my = 0), and drops the parallax entirely under reduced motion.
  icons: {
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.94,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 3px), calc(var(--ds-illo-my) * 3px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 480ms ease, stroke 480ms ease, transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 480ms ease, stroke 480ms ease",
    },
  },
  // Toggle knob: settled ON state driven by the tile's hover/focus, not a pulse
  // loop. It slides right into the "on" position and fills to cream as the card
  // wakes.
  toggleKnob: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    stroke: "none",
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "translateX(-7px)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "translateX(0px)",
    },
    transition: {
      default:
        "transform 420ms var(--ds-illo-ease), fill 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
