import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface StatusDotProps extends Omit<
  ComponentProps<"span">,
  "children" | "className" | "style"
> {
  /**
   * Which colour the dot carries, from the same Intents as `Badge`.
   * `"neutral"` is the muted one, for a mark that only informs.
   *
   * @zh 圆点所承载的颜色，与 `Badge` 使用同一组意图色。`"neutral"` 是柔和的那一种，用于只作提示的标记。
   */
  intent: "neutral" | "info" | "success" | "warning" | "danger" | "accent";
  /**
   * What the dot means, read by a screen reader and not shown. Leave it out
   * only where the place that shows the dot already says it, such as the
   * `status` of a `TabView` item; the dot is then hidden from assistive tech.
   *
   * @zh 圆点的含义，供屏幕阅读器朗读，不在界面上显示。只有在显示圆点的位置已经说明了含义时才可省略，例如 `TabView` 项的 `status`；此时圆点对辅助技术隐藏。
   */
  label?: ReactNode;
  /**
   * StyleX styles merged over the dot's own, composed last.
   *
   * @zh 合并在圆点自身样式之上的 StyleX 样式，最后合成。
   */
  css?: StyleProp;
}

/**
 * A small round mark that says something waits, beside a label or at the
 * corner of an icon. It has no margin of its own: the row it sits in sets
 * the gap. Its meaning goes in `label`, as text only a screen reader reads.
 */
export function StatusDot({
  intent,
  label,
  css,
  ...restProps
}: StatusDotProps) {
  const hasLabel = label !== undefined && label !== null && label !== "";
  return (
    <span
      {...restProps}
      aria-hidden={hasLabel ? undefined : true}
      css={[corner.radius_round, styles.dot, intents[intent], css]}
    >
      {hasLabel ? <span css={a11y.srOnly}>{label}</span> : null}
    </span>
  );
}

const styles = stylex.create({
  dot: {
    display: "inline-block",
    flexShrink: 0,
    inlineSize: space._1,
    blockSize: space._1,
    verticalAlign: "middle",
  },
});

const intents = stylex.create({
  neutral: { backgroundColor: color.fgMuted },
  info: { backgroundColor: color.fgInfo },
  success: { backgroundColor: color.fgSuccess },
  warning: { backgroundColor: color.fgWarning },
  danger: { backgroundColor: color.fgDanger },
  accent: { backgroundColor: color.fgAccent },
});
