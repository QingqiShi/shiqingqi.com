import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "../overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";

const KEEPER_X = 180;
const KEEPER_Y = 96;
const KEEPER_W = 118;
const KEEPER_H = 10;
/** Full stop, set a gap past the keeper's end. */
const STOP_CX = KEEPER_X + KEEPER_W + 9;
const STOP_CY = KEEPER_Y + KEEPER_H / 2;
/** Drops the survivor into the space the cut lines leave behind. */
const KEEPER_SETTLE = "translateY(28px)";

/** The lines that get cut: y, width. */
const CUT_LINES = [
  { y: 120, width: 134 },
  { y: 136, width: 110 },
  { y: 152, width: 142 },
];

/**
 * Voice foundation-card illustration: a four-line paragraph that engaging the
 * card edits down to its first line and a full stop.
 */
export function VoiceIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-voice-orb" cx="50%" cy="50%" r="60%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.75"
          />
          <stop
            offset="55%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.18"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse
        css={styles.orb}
        cx="246"
        cy="124"
        rx="88"
        ry="60"
        fill="url(#dsi-voice-orb)"
      />

      <g css={styles.paragraph}>
        {CUT_LINES.map((line) => (
          <rect
            key={line.y}
            css={styles.cut}
            x={KEEPER_X}
            y={line.y}
            width={line.width}
            height="7"
            rx="3.5"
          />
        ))}

        <g css={styles.keeper}>
          <rect
            css={styles.keeperBar}
            x={KEEPER_X}
            y={KEEPER_Y}
            width={KEEPER_W}
            height={KEEPER_H}
            rx="5"
          />
          <circle css={styles.stop} cx={STOP_CX} cy={STOP_CY} r="4.5" />
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  orb: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.45,
    },
    transformBox: "view-box",
    transformOrigin: "246px 124px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 24px), calc(var(--ds-illo-my) * 18px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 560ms cubic-bezier(0.32, 0.72, 0, 1), transform 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 560ms ease",
    },
  },
  // Pointer lean; mx/my are 0 until IlloLayer feeds a position, so this sits
  // home at rest.
  paragraph: {
    transformBox: "view-box",
    transformOrigin: "244px 124px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(var(--ds-illo-my) * 5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 280ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Retracts towards the start of the line rather than fading in place, so the
  // paragraph reads as edited down and not merely dimmed.
  cut: {
    fill: "var(--ds-illo-ink)",
    opacity: {
      default: 0.32,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0,
    },
    transformBox: "fill-box",
    transformOrigin: "0% 50%",
    transform: {
      default: "scaleX(1)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "scaleX(0.12)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 420ms ease, transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "opacity 420ms ease",
    },
  },
  keeper: {
    transformBox: "view-box",
    transform: {
      default: "translateY(0)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        KEEPER_SETTLE,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  keeperBar: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transition: "fill 520ms ease, opacity 520ms ease",
  },
  // Arrives only once the cutting is done — the sentence ends where it ends.
  stop: {
    fill: "var(--ds-illo-hue-soft)",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transition: "opacity 300ms ease 260ms",
  },
});
