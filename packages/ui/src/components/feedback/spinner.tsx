import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { a11y } from "../../primitives/a11y.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  motionTokens,
} from "../../primitives/motion.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import { color, space } from "../../tokens.stylex.ts";

interface SpinnerBaseProps extends Omit<
  ComponentProps<"span">,
  "children" | "role" | "aria-hidden" | "className" | "style"
> {
  /**
   * Rendered diameter: `sm`/`md`/`lg` use `rem` (WCAG 1.4.4); `"inline"` uses
   * `1em` to match surrounding text. Defaults to `"md"`.
   */
  size?: "inline" | "sm" | "md" | "lg";
  /**
   * Colour. `"current"` (default) inherits `currentColor` so the spinner picks
   * up the surrounding text colour; `"accent"` pins the brand accent.
   */
  tone?: "accent" | "current";
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
}

/**
 * A spinner conveys busy state, so it needs an accessible name — unless it sits
 * inside an already-labelled busy region, in which case it should be hidden to
 * avoid a duplicate announcement. Exactly one of `label` / `aria-hidden` is
 * required at the type level.
 */
type SpinnerA11yProps =
  | {
      /**
       * Accessible name announced via a polite live region (e.g. "Loading").
       * The package ships no i18n, so the consumer supplies the localized
       * string.
       */
      label: string;
      "aria-hidden"?: undefined;
    }
  | {
      /**
       * Marks the spinner purely decorative — use inside a region that already
       * announces the busy state (e.g. a button with `aria-busy`).
       */
      "aria-hidden": true;
      label?: undefined;
    };

type SpinnerProps = SpinnerBaseProps & SpinnerA11yProps;

/**
 * Indeterminate loading indicator — a gapped ring that spins smoothly. Under
 * `prefers-reduced-motion` the rotation is replaced by a gentle opacity pulse,
 * never an infinite spin.
 */
export function Spinner({
  size = "md",
  tone = "current",
  label,
  "aria-hidden": ariaHidden,
  css,
  ...restProps
}: SpinnerProps) {
  const isDecorative = ariaHidden === true;

  return (
    <span
      {...restProps}
      role={isDecorative ? undefined : "status"}
      aria-live={isDecorative ? undefined : "polite"}
      aria-label={isDecorative ? undefined : label}
      aria-hidden={isDecorative ? true : undefined}
      css={[styles.root, sizeStyles[size], toneStyles[tone], css]}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" css={styles.ring}>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={3}
          css={styles.track}
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="25 75"
        />
      </svg>
      {isDecorative ? null : <span css={a11y.srOnly}>{label}</span>}
    </span>
  );
}

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

// Reduced-motion fallback: a static ring that gently breathes instead of
// spinning, keeping the busy affordance visible without vestibular motion.
const pulse = stylex.keyframes({
  "0%": { opacity: 1 },
  "50%": { opacity: 0.3 },
  "100%": { opacity: 1 },
});

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    verticalAlign: "middle",
  },
  ring: {
    inlineSize: "100%",
    blockSize: "100%",
    transformOrigin: "center",
    animationName: {
      default: spin,
      [motionConstants.REDUCED_MOTION]: pulse,
    },
    animationDuration: {
      default: duration._800,
      [motionConstants.REDUCED_MOTION]: duration._1600,
    },
    animationTimingFunction: {
      default: easing.linear,
      [motionConstants.REDUCED_MOTION]: easing.easeInOut,
    },
    animationIterationCount: "infinite",
    // The spin animates on this inner element, so `css` on the root cannot
    // reach it. The inherited `motionTokens.playState` lets an ancestor hold
    // it still.
    animationPlayState: motionTokens.playState,
  },
  track: {
    opacity: 0.25,
  },
});

const sizeStyles = stylex.create({
  // `inline` uses `em`, not `rem`, so it fills the surrounding text or icon
  // box without reflowing the line.
  inline: { inlineSize: "1em", blockSize: "1em" },
  sm: { inlineSize: space._3, blockSize: space._3 },
  md: { inlineSize: space._5, blockSize: space._5 },
  lg: { inlineSize: space._7, blockSize: space._7 },
});

const toneStyles = stylex.create({
  current: { color: "currentColor" },
  accent: { color: color.accent },
});
