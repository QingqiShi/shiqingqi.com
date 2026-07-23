import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase } from "./illustration.stylex.ts";

/**
 * Elevation foundation-card illustration. Four glassy planes recede up and to
 * the right, with the largest, most opaque plane anchored at the bottom. A
 * warm-gold pool of light blooms under the front plane's bottom edge to read as
 * elevation; on hover the stack lifts and fans open toward the cursor while the
 * light pools trail the pointer.
 *
 * Styling is StyleX, applied per SVG element via the `css` prop. The scene reads
 * the shared `--ds-illo` family (aliveness 0 -> 1, centred pointer
 * `--ds-illo-mx` / `--ds-illo-my`) that the tile and IlloLayer publish; the base
 * palette tokens come from `illoBase`.
 */
export function ElevationIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Warm-gold floor pool: bright centre -> transparent edge. Stops
            crossfade neutral -> warm gold as the card wakes. */}
        <radialGradient id="dsi-elevation-elGlowG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" css={styles.gs0} />
          <stop offset="48%" css={styles.gs1} />
          <stop offset="100%" css={styles.gs2} />
        </radialGradient>
        {/* Ambient focal bloom behind the stack. */}
        <radialGradient id="dsi-elevation-elFocalG" cx="50%" cy="58%" r="55%">
          <stop offset="0%" css={styles.fs0} />
          <stop offset="60%" css={styles.fs1} />
          <stop offset="100%" css={styles.fs2} />
        </radialGradient>
        {/* Top-lit glassy sheen on each plane surface. */}
        <linearGradient id="dsi-elevation-elSurfG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" css={styles.us0} />
          <stop offset="100%" css={styles.us1} />
        </linearGradient>
      </defs>

      {/* Ambient focal bloom, hugging the front plane; follows the cursor. */}
      <g css={styles.focalFollow}>
        <ellipse
          css={styles.focal}
          cx="216"
          cy="140"
          rx="112"
          ry="86"
          fill="url(#dsi-elevation-elFocalG)"
        />
      </g>

      {/* Plane 4 — backmost, smallest, faintest; leans furthest on parallax. */}
      <g css={styles.lift4}>
        <g css={[styles.parallax, styles.parallax4]}>
          <rect
            css={styles.pfill}
            x="207"
            y="57"
            width="108"
            height="52"
            rx="12"
            fill="url(#dsi-elevation-elSurfG)"
          />
          <rect
            css={styles.pline}
            x="207"
            y="57"
            width="108"
            height="52"
            rx="12"
          />
        </g>
      </g>

      {/* Plane 3. */}
      <g css={styles.lift3}>
        <g css={[styles.parallax, styles.parallax3]}>
          <rect
            css={styles.pfill}
            x="189"
            y="71"
            width="114"
            height="55"
            rx="12"
            fill="url(#dsi-elevation-elSurfG)"
          />
          <rect
            css={styles.pline}
            x="189"
            y="71"
            width="114"
            height="55"
            rx="12"
          />
        </g>
      </g>

      {/* Plane 2. */}
      <g css={styles.lift2}>
        <g css={[styles.parallax, styles.parallax2]}>
          <rect
            css={styles.pfill}
            x="171"
            y="85"
            width="120"
            height="58"
            rx="12"
            fill="url(#dsi-elevation-elSurfG)"
          />
          <rect
            css={styles.pline}
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
      <g css={styles.poolFollow}>
        <ellipse
          css={styles.pool}
          cx="216"
          cy="160"
          rx="80"
          ry="18"
          fill="url(#dsi-elevation-elGlowG)"
        />
      </g>

      {/* Plane 1 — front, largest, glassiest; anchors the stack, leans least. */}
      <g css={[styles.parallax, styles.parallax1]}>
        <rect
          css={[styles.pfill, styles.pfillLead]}
          x="153"
          y="99"
          width="126"
          height="61"
          rx="13"
          fill="url(#dsi-elevation-elSurfG)"
        />
        <rect
          css={[styles.pline, styles.plineLead]}
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

const styles = stylex.create({
  // Warm-gold floor pool. The stop colour crossfades neutral -> warm gold as
  // the card wakes (--ds-illo 0 -> 1).
  gs0: {
    stopColor:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    stopOpacity: 0.9,
  },
  gs1: {
    stopColor:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    stopOpacity: 0.34,
  },
  gs2: {
    stopColor:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    stopOpacity: 0,
  },
  // Ambient focal bloom — same warm-gold crossfade, fainter.
  fs0: {
    stopColor:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    stopOpacity: 0.34,
  },
  fs1: {
    stopColor:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    stopOpacity: 0.1,
  },
  fs2: {
    stopColor:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    stopOpacity: 0,
  },
  // Glassy top-lit sheen (neutral, translucent).
  us0: {
    stopColor: "var(--ds-illo-ink)",
    stopOpacity: 0.16,
  },
  us1: {
    stopColor: "var(--ds-illo-ink)",
    stopOpacity: 0.02,
  },
  focal: {
    opacity: "calc(0.06 + 0.24 * var(--ds-illo))",
    transition: "opacity 520ms ease",
  },
  // Deepest layer: the bloom drifts furthest toward the pointer, so the light
  // reads as coming from the cursor and the background trails the stack.
  focalFollow: {
    transformBox: "view-box",
    transformOrigin: "216px 140px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 22px), calc(var(--ds-illo-my) * 16px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 380ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The hero light: gold pool that blooms and widens on wake.
  pool: {
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(calc(0.78 + 0.32 * var(--ds-illo)))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    opacity: "calc(0.18 + 0.62 * var(--ds-illo))",
    transition: {
      default:
        "opacity 520ms ease, transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The floor pool tracks the cursor at large magnitude — the light source sits
  // under the pointer.
  poolFollow: {
    transformBox: "view-box",
    transformOrigin: "216px 160px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 30px), calc(var(--ds-illo-my) * 14px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 340ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Glassy plane fills — faint at rest, gently glassier on wake.
  pfill: {
    opacity: "calc(0.14 + 0.22 * var(--ds-illo))",
    transition: "opacity 520ms ease",
  },
  pfillLead: {
    opacity: "calc(0.28 + 0.34 * var(--ds-illo))",
  },
  // Thin light outlines — the receding planes read mostly as these. The stroke
  // crossfades neutral -> light warm-grey as the card wakes.
  pline: {
    fill: "none",
    stroke:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 52%))",
    strokeWidth: 1.4,
    strokeLinejoin: "round",
    opacity: "calc(0.3 + 0.5 * var(--ds-illo))",
    transition: "opacity 520ms ease",
  },
  plineLead: {
    strokeWidth: 1.6,
    opacity: "calc(0.42 + 0.52 * var(--ds-illo))",
  },
  // Hover lift: the stack separates diagonally, up and to the right, on wake.
  lift2: {
    transform: {
      default:
        "translate(calc(4px * var(--ds-illo)), calc(-7px * var(--ds-illo)))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  lift3: {
    transform: {
      default:
        "translate(calc(8px * var(--ds-illo)), calc(-14px * var(--ds-illo)))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  lift4: {
    transform: {
      default:
        "translate(calc(12px * var(--ds-illo)), calc(-21px * var(--ds-illo)))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Pointer parallax: every plane leans toward the cursor, but the deeper planes
  // travel further, so the stack fans open into 3D. A shared origin and a uniform
  // rotate tilt the whole stack rigidly; the per-plane translate does the depth.
  // All values return to centre at rest (mx/my = 0), and hold there under
  // reduced motion.
  parallax: {
    transformBox: "view-box",
    transformOrigin: "216px 118px",
    transition: {
      default: "transform 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  parallax1: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 3px), calc(var(--ds-illo-my) * 3px)) rotate(calc(var(--ds-illo-mx) * 0.8deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  parallax2: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(var(--ds-illo-my) * 5px)) rotate(calc(var(--ds-illo-mx) * 0.8deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  parallax3: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 10px), calc(var(--ds-illo-my) * 8px)) rotate(calc(var(--ds-illo-mx) * 0.8deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  parallax4: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 15px), calc(var(--ds-illo-my) * 12px)) rotate(calc(var(--ds-illo-mx) * 0.8deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
