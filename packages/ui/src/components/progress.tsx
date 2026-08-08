import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { corner } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { border, color, space } from "../tokens.stylex.ts";
import { progressTokens } from "./progress.stylex.ts";

type ProgressSize = "sm" | "md" | "lg";

interface ProgressProps extends Omit<
  ComponentProps<"div">,
  | "role"
  | "children"
  | "aria-label"
  | "aria-valuenow"
  | "aria-valuemin"
  | "aria-valuemax"
> {
  /** How much is done. Clamped to `0`–`max`. */
  value: number;
  /** The value that means finished. Defaults to `100`. */
  max?: number;
  /**
   * Accessible name (e.g. "Upload progress"). The package ships no i18n, so the
   * consumer supplies the localized string.
   */
  label: string;
  /**
   * Track thickness. The steps map to `rem` so the bar scales with the user's
   * font size (WCAG 1.4.4). Defaults to `"md"`.
   */
  size?: ProgressSize;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
}

/**
 * Determinate meter: how far through a task of known length something is. Work
 * with no measurable end is `Spinner`'s job, not this one.
 *
 * Renders a `role="progressbar"` `<div>` and forwards native attributes (`id`,
 * `data-*`, `className`, `style`, `ref`); `css` is composed last. Pass
 * `aria-valuetext` where a bare percentage would mislead ("Step 3 of 5"), and
 * set `progressTokens.indicatorColor` through `css` to retint the fill.
 */
export function Progress({
  value,
  max = 100,
  label,
  size = "md",
  css,
  className,
  style,
  ...restProps
}: ProgressProps) {
  // Clamp both ends before anything reaches ARIA: a non-finite or non-positive
  // bound would otherwise announce a value screen readers can't interpret.
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), safeMax)
    : 0;

  return (
    <div
      {...restProps}
      className={className}
      style={style}
      role="progressbar"
      aria-label={label}
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      css={[
        corner.radius_round,
        styles.track,
        sizeStyles[size],
        styles.indicator((safeValue / safeMax) * 100),
        css,
      ]}
    />
  );
}

const styles = stylex.create({
  track: {
    inlineSize: "100%",
    // The same fill `Divider` uses for a rule — a track is a thick one, and
    // `surfaceNeutralSubtle` all but vanishes against a dark surface.
    backgroundColor: color.neutralBorder,
    overflow: "hidden",
    "::before": {
      content: "",
      display: "block",
      blockSize: "100%",
      inlineSize: progressTokens.indicatorSize,
      borderRadius: border.radius_round,
      cornerShape: "squircle",
      backgroundColor: progressTokens.indicatorColor,
      transition: {
        default: `inline-size ${duration._300} ${easing.easeOut}`,
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
  },
  indicator: (percent: number) => ({
    [progressTokens.indicatorSize]: `${String(percent)}%`,
  }),
});

const sizeStyles = stylex.create({
  sm: { blockSize: space._0 },
  md: { blockSize: space._1 },
  lg: { blockSize: space._2 },
});
