import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { cluster } from "../primitives/stack.stylex.ts";
import { border, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { formFooterStyles } from "./form-footer.stylex.ts";
import { StickyFormFooter } from "./sticky-form-footer.tsx";

/** @internal */
export interface FormFooterProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "css"
> {
  /**
   * The form's actions, such as a ghost "Cancel" and a primary "Save
   * changes", in reading order. They sit at the end of the line, the
   * primary action last.
   *
   * @zh 表单的操作，例如幽灵样式的「取消」与主要样式的「保存更改」，按阅读顺序排列。它们位于行尾，主要操作在最后。
   */
  children: ReactNode;
  /**
   * Draws a line above the actions, to set them apart from the last field.
   *
   * @zh 在操作上方画一条线，把它们与最后一个字段分开。
   */
  divider?: boolean;
  /**
   * Keeps the actions in view at the bottom of the screen, or of the
   * scrolling column, while the form scrolls under them, and lets them go
   * at the end of the form. While they float, they sit on a small pill of
   * Glass, above the tab bar of a `TabView` and the safe area. When the
   * buttons do not fit on one line, as on a phone, the pill takes the width
   * of the column and the buttons wrap onto a second line, each whole, the
   * main action last. Put the footer last in the form's box, as a sticky box
   * stays inside its parent.
   *
   * @zh 表单在操作下方滚动时，把操作保持在屏幕（或滚动列）底部可见，到表单末尾时随表单离开。浮起时，它们位于一枚小巧的 Glass 胶囊上，处于 `TabView` 的标签栏与安全区域之上。按钮在一行内放不下时（例如在手机上），胶囊占满整列宽度，按钮整体换到第二行，主要操作仍在最后。请把页脚放在表单盒子的最后，因为粘性盒子只在其父元素内停留。
   */
  sticky?: boolean;
  /**
   * StyleX styles merged over the row of actions — the config-layer escape
   * hatch.
   *
   * @zh 合并在操作行自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * The actions of a form, such as Cancel and Save, at the end of the line
 * under the fields. `divider` draws a line above them, and `sticky` keeps
 * them in view while a long form scrolls.
 */
export function FormFooter({
  children,
  divider = false,
  sticky = false,
  css,
  ...rest
}: FormFooterProps) {
  if (sticky) {
    return (
      <StickyFormFooter {...rest} divider={divider} css={css}>
        {children}
      </StickyFormFooter>
    );
  }
  return (
    <div
      {...rest}
      css={[
        cluster.tight,
        formFooterStyles.actions,
        divider && styles.divider,
        css,
      ]}
    >
      {children}
    </div>
  );
}

const styles = stylex.create({
  // The line and the space under it, as a `Divider` in a `stack.item` form.
  divider: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    paddingBlockStart: rhythm.item,
  },
});
