import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "../overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";

// SVG has no `corner-shape`, so the lens is drawn as a path. Both cubic handles
// of a corner sit at this share of the radius from the box corner, which puts
// the curve's midpoint on the n=4 superellipse — the same squircle the `corner`
// primitive draws.
const SQUIRCLE_HANDLE = 0.0909;

function squirclePath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width;
  const bottom = y + height;
  const handle = radius * SQUIRCLE_HANDLE;
  // Segments are joined rather than interpolated, so the numbers stay numbers.
  return [
    "M",
    x + radius,
    y,
    "H",
    right - radius,
    "C",
    right - handle,
    y,
    right,
    y + handle,
    right,
    y + radius,
    "V",
    bottom - radius,
    "C",
    right,
    bottom - handle,
    right - handle,
    bottom,
    right - radius,
    bottom,
    "H",
    x + radius,
    "C",
    x + handle,
    bottom,
    x,
    bottom - handle,
    x,
    bottom - radius,
    "V",
    y + radius,
    "C",
    x,
    y + handle,
    x + handle,
    y,
    x + radius,
    y,
    "Z",
  ].join(" ");
}

const LENS = squirclePath(180, 76, 132, 84, 30);

const FIELD = { x: 126, y: 20, width: 220, height: 188 };

/** The dot field with the wash drifting across it — drawn once behind the lens, and again inside it. */
function Field() {
  return (
    <>
      <rect {...FIELD} fill="url(#dsi-material-dots)" />
      <rect
        {...FIELD}
        css={styles.washRest}
        fill="url(#dsi-material-washInk)"
      />
      <rect
        {...FIELD}
        css={styles.washAlive}
        fill="url(#dsi-material-washHue)"
      />
    </>
  );
}

/**
 * Material foundation-card illustration: a faint dot field with a wash drifting
 * across it — grey at rest, warm gold on hover — and one squircle glass lens
 * floating over it, its top rim lit and its own patch of the field blurred.
 */
export function MaterialIllustration() {
  return (
    <svg
      css={[illoBase.svg, styles.svg]}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dsi-material-dots"
          x="0"
          y="0"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="5" cy="5" r="0.9" fill="var(--ds-illo-ink)" />
        </pattern>
        <linearGradient id="dsi-material-washInk" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.36" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dsi-material-washHue" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="var(--ds-illo-hue)" stopOpacity="0.46" />
          <stop
            offset="100%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0"
          />
        </linearGradient>
        <radialGradient id="dsi-material-fade" cx="66%" cy="66%" r="74%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dsi-material-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="34%" stopColor="var(--ds-illo-rim)" />
          <stop offset="66%" stopColor="var(--ds-illo-rim)" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
        </linearGradient>
        <mask id="dsi-material-fieldMask">
          <rect {...FIELD} fill="url(#dsi-material-fade)" />
        </mask>
        <clipPath id="dsi-material-lensClip">
          <path d={LENS} />
        </clipPath>
      </defs>

      <g mask="url(#dsi-material-fieldMask)">
        <Field />
      </g>

      <g css={styles.lens}>
        <path css={styles.lensShadow} d={LENS} />
        <g clipPath="url(#dsi-material-lensClip)">
          {/* The lens carries its own patch of the field, blurred. The inverse
              lean holds that patch still while the lens moves over it. */}
          <g css={styles.backdrop} mask="url(#dsi-material-fieldMask)">
            <Field />
          </g>
          <path css={styles.lensFill} d={LENS} />
        </g>
        <path
          d={LENS}
          fill="none"
          stroke="url(#dsi-material-rim)"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  // The rim's own colour, under the light on it: a dark edge against a light
  // page, clear against a dark one — the reading `color.glassBorder` gives.
  svg: {
    "--ds-illo-rim":
      "light-dark(rgba(26, 26, 28, 0.38), rgba(255, 255, 255, 0))",
  },
  washRest: {
    opacity: {
      default: 1,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0,
    },
    transition: "opacity 500ms ease",
  },
  washAlive: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transition: "opacity 560ms ease",
  },
  lens: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 7px), calc(var(--ds-illo-my) * 5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  backdrop: {
    filter: "blur(2px)",
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * -7px), calc(var(--ds-illo-my) * -5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Glass is the one thing here that casts a shadow.
  lensShadow: {
    fill: "light-dark(rgba(26, 26, 28, 0.22), rgba(0, 0, 0, 0.5))",
    filter: "blur(7px)",
    transform: "translateY(7px)",
  },
  lensFill: {
    fill: "light-dark(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))",
  },
});
