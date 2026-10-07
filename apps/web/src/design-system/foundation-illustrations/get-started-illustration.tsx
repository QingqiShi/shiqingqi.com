import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";
import { squirclePath } from "./squircle-path.ts";

const WINDOW = squirclePath(176, 70, 190, 130, 22);

const COMMAND_X = 206;
const COMMAND_Y = 110;
const COMMAND_W = 96;

/** The lines that follow the command: y, width. */
const OUTPUT_LINES = [
  { y: 128, width: 58 },
  { y: 142, width: 84 },
];

/**
 * Get started foundation-card illustration: a terminal window with a prompt.
 * Engaging the card types the rest of the command, and a tick lands on the
 * line under it.
 */
export function GetStartedIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-get-started-orb" cx="50%" cy="50%" r="60%">
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
        cx="258"
        cy="128"
        rx="84"
        ry="56"
        fill="url(#dsi-get-started-orb)"
      />

      <g css={styles.window}>
        <path css={styles.frame} d={WINDOW} />
        <line css={styles.titleRule} x1="176" y1="90" x2="366" y2="90" />
        {[191, 202, 213].map((cx) => (
          <circle key={cx} css={styles.light} cx={cx} cy="80" r="3" />
        ))}

        <g css={styles.content}>
          <polyline css={styles.prompt} points="188,109 194,113 188,117" />
          <rect
            css={styles.command}
            x={COMMAND_X}
            y={COMMAND_Y}
            width={COMMAND_W}
            height="6"
            rx="3"
          />
          <g css={styles.caret}>
            <line
              css={styles.caretBlink}
              x1={COMMAND_X + COMMAND_W + 5}
              y1={COMMAND_Y - 3}
              x2={COMMAND_X + COMMAND_W + 5}
              y2={COMMAND_Y + 9}
            />
          </g>

          {OUTPUT_LINES.map((line) => (
            <rect
              key={line.y}
              css={styles.output}
              x={COMMAND_X}
              y={line.y}
              width={line.width}
              height="6"
              rx="3"
            />
          ))}

          <polyline css={styles.tick} points="187,159 191,163 198,155" />
          <rect
            css={styles.done}
            x={COMMAND_X}
            y="156"
            width="46"
            height="6"
            rx="3"
          />
        </g>
      </g>
    </svg>
  );
}

// Runs continuously but only reads once the card is engaged, when the caret
// shows at full strength.
const blink = stylex.keyframes({
  "0%, 55%": { opacity: 1 },
  "70%, 90%": { opacity: 0.1 },
  "100%": { opacity: 1 },
});

const styles = stylex.create({
  orb: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.45,
    },
    transformBox: "view-box",
    transformOrigin: "258px 128px",
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
  window: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 5px), calc(var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The lines lean further than the frame, so the window reads as having depth.
  content: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 3px), calc(var(--ds-illo-my) * 2.5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  frame: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    strokeWidth: 1.4,
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.8,
    },
    transition: "stroke 500ms ease, opacity 500ms ease",
  },
  titleRule: {
    stroke: "var(--ds-illo-ink)",
    strokeWidth: 1,
    opacity: 0.3,
  },
  light: {
    fill: "var(--ds-illo-ink)",
    opacity: {
      default: 0.35,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.55,
    },
    transition: "opacity 500ms ease",
  },
  prompt: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transition: "stroke 500ms ease, opacity 500ms ease",
  },
  // Shows a quarter of the command at rest and grows from the start of the
  // line, so the command reads as typed rather than faded in.
  command: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transformBox: "fill-box",
    transformOrigin: "0% 50%",
    transform: {
      default: "scaleX(0.25)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "scaleX(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "fill 500ms ease, opacity 500ms ease, transform 640ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "fill 500ms ease, opacity 500ms ease",
    },
  },
  // Rides the end of the command: at rest it sits after the quarter of the
  // command (96px) that `command` shows. The blink sits on the line inside, so the
  // animation cannot override the rest opacity set here.
  caret: {
    opacity: {
      default: 0.35,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transformBox: "view-box",
    transform: {
      default: "translateX(-72px)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "translateX(0)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 400ms ease, transform 640ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "opacity 400ms ease",
    },
  },
  caretBlink: {
    stroke: "var(--ds-illo-hue-soft)",
    strokeWidth: 1.6,
    strokeLinecap: "butt",
    animationName: { default: blink, [motionConstants.REDUCED_MOTION]: "none" },
    animationDuration: "2.1s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  output: {
    fill: "var(--ds-illo-ink)",
    opacity: {
      default: 0.28,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.45,
    },
    transition: "opacity 500ms ease",
  },
  // Arrive once the command is typed.
  tick: {
    fill: "none",
    stroke: "var(--ds-illo-hue)",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transition: "opacity 300ms ease 420ms",
  },
  done: {
    fill: "var(--ds-illo-hue-soft)",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.85,
    },
    transition: "opacity 300ms ease 480ms",
  },
});
