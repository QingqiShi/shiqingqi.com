import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Borders foundation-card illustration. A stack of concentric rounded frames
 * sharing one bottom-right corner and bleeding off the right and bottom edges.
 * Stepping inward the corner radius shrinks (the corner-radius scale) while the
 * stroke treatment varies — a thin outer keyline, a dashed frame whose left
 * edge falls as a long dashed line, a bright accent frame, quieter grey frames,
 * and a small dark rounded rect at the core (the border-width scale). At rest
 * the frames read as dim monochrome greys; on hover the two accent frames warm
 * to gold and a soft bloom glows in.
 *
 * On hover the frames react to the pointer: each ring (`ring1`..`ring6`) leans
 * toward the cursor by a magnitude that grows with nesting, so the flat nest
 * pulls apart into layered depth, and a warm bloom trails the cursor so the
 * gold accents catch light where the pointer sits.
 *
 * Styling is StyleX, applied per SVG element via the `css` prop. The rest ->
 * alive bloom keys off the tile's own state with `stylex.when.ancestor(...)` (the
 * tile carries `illoMarker`), so each element transitions its own opacity between
 * the two states — no shared signal variable. Continuous pointer lean/parallax
 * reads the inherited `--ds-illo-mx/my` (centred at rest, so the transforms sit
 * at home until IlloLayer feeds a pointer position); the base palette tokens come
 * from `illoBase`.
 */
export function BordersIllustration() {
  return (
    <svg
      css={illoBase.svg}
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
        css={styles.inkGlow}
        cx="300"
        cy="150"
        r="96"
        fill="url(#dsi-borders-ink)"
      />

      {/* Amber bloom: intensifies on hover and trails the cursor. */}
      <circle
        css={styles.bloom}
        cx="298"
        cy="146"
        r="108"
        fill="url(#dsi-borders-hue)"
      />

      {/* The nest of frames — leans and parallaxes toward the cursor as a body. */}
      <g css={styles.frames}>
        {/* Small dark rounded rect at the core (drawn first so keylines sit over
            its edge). Reads as a darker inset patch in both themes. Moves with
            the core keyline (ring-6) so the corner patch stays coherent. */}
        <rect
          css={[
            styles.coreFill,
            styles.ringGroup,
            styles.ring6,
            styles.coreFillRing6,
          ]}
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
          css={styles.grey}
          fill="none"
          stroke="var(--ds-illo-ink)"
          strokeLinejoin="round"
        >
          {/* Dashed frame — its left edge falls as a long dashed line. */}
          <rect
            css={[styles.ringGroup, styles.ring2]}
            x="182"
            y="58"
            width="206"
            height="178"
            rx="46"
            strokeWidth="1.4"
            strokeDasharray="6 7"
          />
          <rect
            css={[styles.ringGroup, styles.ring4]}
            x="244"
            y="104"
            width="144"
            height="132"
            rx="30"
            strokeWidth="1.6"
          />
          <rect
            css={[styles.ringGroup, styles.ring5]}
            x="272"
            y="124"
            width="116"
            height="112"
            rx="23"
            strokeWidth="1.6"
          />
          <rect
            css={[styles.ringGroup, styles.ring6]}
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
          css={styles.accentRest}
          fill="none"
          stroke="var(--ds-illo-ink)"
          strokeLinejoin="round"
        >
          <rect
            css={[styles.ringGroup, styles.ring1]}
            x="150"
            y="34"
            width="238"
            height="202"
            rx="54"
            strokeWidth="1.3"
          />
          <rect
            css={[styles.ringGroup, styles.ring3]}
            x="214"
            y="82"
            width="174"
            height="154"
            rx="38"
            strokeWidth="2.6"
          />
        </g>

        {/* ============ ACCENT FRAMES — gold on hover ============ */}
        <g css={styles.accentAlive} fill="none" strokeLinejoin="round">
          <rect
            css={[styles.ringGroup, styles.ring1]}
            x="150"
            y="34"
            width="238"
            height="202"
            rx="54"
            stroke="var(--ds-illo-hue-soft)"
            strokeWidth="1.3"
          />
          <rect
            css={[styles.ringGroup, styles.ring3]}
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

const styles = stylex.create({
  // Resting grey glow — the "at rest" layer. Fades out as the card comes alive;
  // holds still so the moving warm bloom reads as the light taking over.
  inkGlow: {
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 500ms ease",
  },
  // Warm bloom: no breathing loop. It trails the cursor across the nest, so the
  // gold light reads as coming from the pointer and the accent frames catch
  // light on whichever side the cursor sits. Larger travel than any ring, so it
  // sits furthest back in the parallax stack.
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.5,
    },
    transformBox: "view-box",
    transformOrigin: "298px 146px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 22px), calc(var(--ds-illo-my) * 16px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 550ms cubic-bezier(0.32, 0.72, 0, 1), transform 440ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The whole nest tilts a hair toward the cursor — combined with the per-ring
  // offsets below, the concentric frames swing as one body while pulling apart
  // into depth. Settles flat (mx = 0) when the pointer leaves.
  frames: {
    transformBox: "view-box",
    transformOrigin: "300px 150px",
    transform: {
      default: "rotate(calc(var(--ds-illo-mx) * 1.1deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Colour bloom — unchanged resting look. Grey frames at rest, accent frames
  // cross-fade grey -> gold on hover.
  grey: {
    opacity: {
      default: 0.46,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.58,
    },
    transition: "opacity 450ms ease",
  },
  accentRest: {
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 450ms ease",
  },
  accentAlive: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transition: "opacity 450ms ease",
  },
  coreFill: {
    opacity: {
      default: 0.62,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.92,
    },
  },
  // ---- Concentric parallax depth ------------------------------------------
  // Each ring translates toward the cursor by a magnitude that grows with
  // nesting: the outermost frame barely moves, the tiny core swings widest, so
  // the flat nest pulls apart into layered 3D. Vertical travel is a touch
  // smaller than horizontal to match the card's landscape aspect. Rings share a
  // style regardless of colour treatment, so the grey and gold copies of an
  // accent frame move in lockstep.
  ringGroup: {
    transformBox: "view-box",
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring1: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 2px), calc(var(--ds-illo-my) * 1.6px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring2: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 4px), calc(var(--ds-illo-my) * 3.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring3: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6.5px), calc(var(--ds-illo-my) * 5.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring4: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 7.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring5: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 11.5px), calc(var(--ds-illo-my) * 9.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Core keyline + its dark fill share ring-6 so the corner patch stays coherent
  // as it swings widest.
  ring6: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 14px), calc(var(--ds-illo-my) * 11px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  coreFillRing6: {
    transition: {
      default: "opacity 500ms ease, transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
