import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import { color } from "../color.stylex.ts";
import { border } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { FlowBlock } from "./flow-block.tsx";

interface DividerProps {
  /**
   * Line direction. Renders a semantic `<hr>` when horizontal, or a
   * `role="separator"` `<div>` when vertical.
   *
   * @zh 线条方向。水平时渲染语义化的 `<hr>`，垂直时渲染 `role="separator"` 的 `<div>`。
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Weight / treatment of the rule. Defaults to `"subtle"`.
   *
   * @zh 分隔线的粗细与样式处理。
   */
  look?: "subtle" | "bold" | "decorative";
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh 最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。
   */
  css?: StyleProp;
  /**
   * Ref to the rendered element (`<hr>` when horizontal, `<div>` when vertical).
   *
   * @zh 指向渲染元素的 ref（水平为 `<hr>`，垂直为 `<div>`）。
   */
  ref?: Ref<HTMLElement>;
}

/**
 * Thin separator rule: a semantic `<hr>` when horizontal, or a
 * `role="separator"` `<div>` when vertical, since an `<hr>` cannot be turned
 * on its side accessibly.
 */
export function Divider({
  orientation = "horizontal",
  look = "subtle",
  css,
  ref,
}: DividerProps) {
  // The `decorative` look is an ornamental flourish, not a content
  // boundary, so it opts out of the `separator` role.
  const decorative = look === "decorative";

  if (orientation === "vertical") {
    return (
      <FlowBlock
        role={decorative ? "presentation" : "separator"}
        aria-orientation={decorative ? undefined : "vertical"}
        ref={ref}
        css={[styles.base, styles.vertical, verticalLookStyles[look], css]}
      />
    );
  }

  return (
    <FlowBlock
      as="hr"
      ref={ref}
      role={decorative ? "presentation" : undefined}
      css={[styles.base, styles.horizontal, horizontalLookStyles[look], css]}
    />
  );
}

const styles = stylex.create({
  base: {
    borderWidth: 0,
    borderStyle: "none",
    margin: 0,
    padding: 0,
  },
  horizontal: {
    inlineSize: "100%",
  },
  vertical: {
    blockSize: "100%",
  },
});

const horizontalLookStyles = stylex.create({
  subtle: {
    blockSize: border.size_1,
    backgroundColor: color.border,
  },
  bold: {
    blockSize: border.size_2,
    backgroundColor: color.border,
  },
  decorative: {
    blockSize: border.size_1,
    backgroundImage: `linear-gradient(135deg, ${color.bgAccent} 0%, ${color.bgInfo} 100%)`,
  },
});

const verticalLookStyles = stylex.create({
  subtle: {
    inlineSize: border.size_1,
    backgroundColor: color.border,
  },
  bold: {
    inlineSize: border.size_2,
    backgroundColor: color.border,
  },
  decorative: {
    inlineSize: border.size_1,
    backgroundImage: `linear-gradient(180deg, ${color.bgAccent} 0%, ${color.bgInfo} 100%)`,
  },
});
