import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { corner } from "../../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../../primitives/motion.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import { border, color, space } from "../../tokens.stylex.ts";
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
  | "className"
  | "style"
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
 * Determinate meter for a task of known length; use `Spinner` when there is
 * no measurable end. Retint via `progressTokens.indicatorColor`, since `css`
 * can't reach the pseudo-element that paints the fill.
 */
export function Progress({
  value,
  max = 100,
  label,
  size = "md",
  css,
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
    // Reuses `Divider`'s rule fill: `surfaceNeutralSubtle` would nearly
    // vanish against a dark surface.
    backgroundColor: color.neutralBorder,
    overflow: "hidden",
    "::before": {
      content: "",
      display: "block",
      blockSize: "100%",
      inlineSize: progressTokens.indicatorSize,
      borderRadius: border.radius_round,
      cornerShape: "round",
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
