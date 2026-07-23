import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase } from "./illustration.stylex.ts";

/**
 * Color foundation-card illustration. A row of tonal swatch squares (dark ->
 * tan) above a row of tonal circles (dark, grey, white, gold, purple). At rest
 * the whole scene is a monochrome value ramp; on hover the true palette colours
 * bloom in (the "comes alive" moment). The scene leans toward the pointer while
 * a warm glow follows it at a larger magnitude, and a specular highlight tracks
 * the cursor across the row.
 *
 * Styling is StyleX, applied per SVG element via the `css` prop. The scene reads
 * the shared `--ds-illo` family (aliveness 0 -> 1, centred pointer
 * `--ds-illo-mx` / `--ds-illo-my`) that the tile and IlloLayer publish; the base
 * palette tokens come from `illoBase`, with the hue pair overridden to purple.
 */
export function ColorIllustration() {
  return (
    <svg
      css={[illoBase.svg, styles.svg]}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* Ambient bloom (rest ink -> alive warm) anchored under the row. */}
        <radialGradient id="dsi-color-bloomInk" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.3" />
          <stop offset="55%" stopColor="var(--ds-illo-ink)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-color-bloomChroma" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c58b52" stopOpacity="0.4" />
          <stop offset="46%" stopColor="#7d4fce" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#7d4fce" stopOpacity="0" />
        </radialGradient>

        {/* White chip: bright top-lit sphere. */}
        <radialGradient id="dsi-color-white" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="70%" stopColor="#eceae4" stopOpacity="1" />
          <stop offset="100%" stopColor="#c9c6bd" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="dsi-color-gold" cx="42%" cy="32%" r="74%">
          <stop offset="0%" stopColor="#e7c184" stopOpacity="1" />
          <stop offset="62%" stopColor="#cf9a4f" stopOpacity="1" />
          <stop offset="100%" stopColor="#a8763a" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="dsi-color-purple" cx="42%" cy="32%" r="74%">
          <stop offset="0%" stopColor="#a877ee" stopOpacity="1" />
          <stop offset="62%" stopColor="#8a4fdb" stopOpacity="1" />
          <stop offset="100%" stopColor="#6d34b8" stopOpacity="1" />
        </radialGradient>
        {/* Sheen that travels across the row on hover. */}
        <linearGradient id="dsi-color-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="dsi-color-rowClip">
          <circle cx="156" cy="130" r="20" />
          <circle cx="194" cy="130" r="20" />
          <circle cx="232" cy="130" r="20" />
          <circle cx="270" cy="130" r="20" />
          <circle cx="308" cy="130" r="20" />
        </clipPath>
      </defs>

      <g css={styles.art}>
        {/* Warm field glow behind the row: follows the pointer at a large
            magnitude so it reads as the light source and pulls into depth. */}
        <g css={styles.glow}>
          <circle cx="250" cy="128" r="96" fill="url(#dsi-color-bloomInk)" />
          <circle
            css={styles.bloomChroma}
            cx="250"
            cy="128"
            r="96"
            fill="url(#dsi-color-bloomChroma)"
          />
        </g>

        {/* Foreground swatches + circles: lean toward the pointer. */}
        <g css={styles.scene}>
          {/* ---- REST: monochrome value ramp ---- */}
          <g css={styles.ink}>
            {/* swatch row */}
            <rect
              x="196"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#3a3a3a"
            />
            <rect
              x="230"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#484846"
            />
            <rect
              x="264"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#5a5a56"
            />
            <rect
              x="298"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#6f6d66"
            />
            {/* circle row */}
            <circle cx="156" cy="130" r="20" fill="#343436" />
            <circle cx="194" cy="130" r="20" fill="#4c4c4e" />
            <circle cx="232" cy="130" r="20" fill="#6a6a6c" />
            <circle cx="270" cy="130" r="20" fill="#8a8a88" />
            <circle cx="308" cy="130" r="20" fill="#a3a29c" />
          </g>

          {/* ---- ALIVE: true palette colours ---- */}
          <g css={styles.chroma}>
            {/* swatch row: dark -> dark -> mid -> tan */}
            <rect
              x="196"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#26262a"
            />
            <rect
              x="230"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#3a3634"
            />
            <rect
              x="264"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#6b5f4f"
            />
            <rect
              x="298"
              y="72"
              width="30"
              height="30"
              rx="6.5"
              fill="#a9855a"
            />
            {/* circle row: dark, grey, white, gold, purple */}
            <circle cx="156" cy="130" r="20" fill="#2c2c2e" />
            <circle cx="194" cy="130" r="20" fill="#6c6c6e" />
            <circle cx="232" cy="130" r="20" fill="url(#dsi-color-white)" />
            <circle cx="270" cy="130" r="20" fill="url(#dsi-color-gold)" />
            <circle cx="308" cy="130" r="20" fill="url(#dsi-color-purple)" />
          </g>

          {/* Specular highlight, masked to the circle row, on hover only. It
              tracks the cursor's X across the circles rather than sweeping. */}
          <g css={styles.sheenWrap} clipPath="url(#dsi-color-rowClip)">
            <rect
              css={styles.sheen}
              x="208"
              y="108"
              width="48"
              height="44"
              fill="url(#dsi-color-sheen)"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  // color re-declares the hue pair to purple — illoBase ships the gold pair and
  // the shared ink / ease; later writes win per property.
  svg: {
    "--ds-illo-hue": "light-dark(#8f31be, #cc6dfb)",
    "--ds-illo-hue-soft": "light-dark(#b154e0, #e8b2ff)",
  },
  // Reveal scale: the scene grows a hair as the palette blooms in. Driven by
  // --ds-illo, not a timer.
  art: {
    transformBox: "fill-box",
    transformOrigin: "100% 100%",
    transform: {
      default: "scale(calc(0.96 + 0.04 * var(--ds-illo)))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 550ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Warm field glow: no drift loop. It follows the cursor at a large magnitude
  // so the light reads as coming from the pointer, pulling away from the
  // foreground into depth. Settles to centre (mx/my = 0) when the pointer leaves.
  glow: {
    transformBox: "view-box",
    transformOrigin: "250px 128px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 24px), calc(var(--ds-illo-my) * 20px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Foreground swatches + circles lean toward the cursor — a small translate
  // plus a hair of rotation reads as the row catching the light, parallaxing
  // ahead of the glow behind it.
  scene: {
    transformBox: "view-box",
    transformOrigin: "232px 116px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 5px), calc(var(--ds-illo-my) * 4px)) rotate(calc(var(--ds-illo-mx) * 1deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ink: {
    opacity: "calc(0.9 * (1 - var(--ds-illo)))",
    transition: "opacity 500ms ease",
  },
  chroma: {
    opacity: "var(--ds-illo)",
    transition: "opacity 560ms ease",
  },
  bloomChroma: {
    opacity: "calc(0.95 * var(--ds-illo))",
    transition: "opacity 560ms ease",
  },
  sheenWrap: {
    opacity: "calc(0.9 * var(--ds-illo))",
    transition: "opacity 500ms ease",
  },
  // Specular highlight: instead of sweeping on a timer, it glints where the
  // cursor is — tracking the pointer's horizontal position across the circles.
  sheen: {
    transform: {
      default: "translateX(calc(var(--ds-illo-mx) * 70px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 220ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
