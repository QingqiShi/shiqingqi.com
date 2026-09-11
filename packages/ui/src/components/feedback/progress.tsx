import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { corner } from "../../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../../primitives/motion.stylex.ts";
import { border, color, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { progressTokens } from "./progress.stylex.ts";

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
  /**
   * How much is done. Clamped to `0`–`max`; a non-finite number falls back
   * to `0`.
   *
   * @zh 已完成的量。会被限制在 `0`–`max` 之间；非有限数值则回退为 `0`。
   */
  value: number;
  /**
   * The value that means finished. A non-finite or non-positive `max` falls
   * back to `100`.
   *
   * @zh 代表完成的数值。非有限或非正数的 `max` 会回退为 `100`。
   */
  max?: number;
  /**
   * Accessible name (e.g. "Upload progress"). The package ships no i18n, so the
   * consumer supplies the localized string.
   *
   * @zh 无障碍名称（例如“Upload progress”）。本包不内置 i18n，请由调用方提供本地化字符串。
   */
  label: string;
  /**
   * Track thickness. The steps map to `rem` so the bar scales with the user's
   * font size (WCAG 1.4.4). Defaults to `"md"`.
   *
   * @zh 轨道厚度。各阶梯以 `rem` 表示，因此进度条随用户字号缩放（WCAG 1.4.4）。
   */
  size?: "sm" | "md" | "lg";
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   * The indicator fill is a `::before` pseudo-element `css` can't reach —
   * retint it via `progressTokens.indicatorColor` instead.
   *
   * @zh StyleX 覆盖样式，最后合成，使调用方可以覆盖默认值。指示条的填充是 `css` 无法触及的 `::before` 伪元素——请改用 `progressTokens.indicatorColor` 来改变其颜色。
   */
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
