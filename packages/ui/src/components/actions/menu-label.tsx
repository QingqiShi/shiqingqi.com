import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { color, controlSize, font } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";

interface MenuLabelProps extends Omit<
  ComponentProps<"div">,
  "className" | "style"
> {
  /**
   * StyleX styles merged over the label's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在标签自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * Muted caption for a group of controls inside a `MenuButton` popup. Purely
 * presentational — give it an `id` and point the group's `aria-labelledby` at
 * it when the popup contains multiple sections.
 */
export function MenuLabel({ children, css, ...props }: MenuLabelProps) {
  return (
    <div {...props} css={[styles.label, css]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  label: {
    fontSize: font.uiControlCaption,
    paddingBlockEnd: controlSize._2,
    color: color.textMuted,
  },
});
