import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { motionConstants } from "../primitives/motion.stylex.ts";
import { color, space } from "../tokens.stylex.ts";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerTone = "accent" | "current";

interface SpinnerBaseProps extends Omit<
  ComponentProps<"span">,
  "children" | "role" | "aria-hidden"
> {
  /**
   * Rendered diameter. Maps to `rem` so the indicator scales with the user's
   * font size (WCAG 1.4.4). Defaults to `"md"`.
   */
  size?: SpinnerSize;
  /**
   * Colour. `"current"` (default) inherits `currentColor` so the spinner picks
   * up the surrounding text colour; `"accent"` pins the brand accent.
   */
  tone?: SpinnerTone;
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
 * never an infinite spin. Renders an `<span>` and forwards native attributes
 * (`id`, `data-*`, `className`, `style`, `ref`); `css` is composed last.
 */
export function Spinner({
  size = "md",
  tone = "current",
  label,
  "aria-hidden": ariaHidden,
  css,
  className,
  style,
  ...restProps
}: SpinnerProps) {
  const isDecorative = ariaHidden === true;

  return (
    <span
      {...restProps}
      className={className}
      style={style}
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

// Reduced-motion fallback: a static gapped ring that gently breathes instead of
// spinning, so the busy affordance stays visible without vestibular motion.
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
      default: "0.8s",
      [motionConstants.REDUCED_MOTION]: "1.6s",
    },
    animationTimingFunction: {
      default: "linear",
      [motionConstants.REDUCED_MOTION]: "ease-in-out",
    },
    animationIterationCount: "infinite",
  },
  track: {
    opacity: 0.25,
  },
});

const sizeStyles = stylex.create({
  sm: { inlineSize: space._3, blockSize: space._3 },
  md: { inlineSize: space._5, blockSize: space._5 },
  lg: { inlineSize: space._7, blockSize: space._7 },
});

const toneStyles = stylex.create({
  current: { color: "currentColor" },
  accent: { color: color.accent },
});
