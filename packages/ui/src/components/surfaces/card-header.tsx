import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { slotStyles } from "./card-slot.stylex.ts";

interface CardHeaderProps extends Omit<
  ComponentProps<"div">,
  "className" | "style"
> {
  /**
   * Control at the header's trailing edge — a menu button, dismiss, or badge.
   * Stays top-aligned and never squeezes; a long title wraps beneath it instead.
   *
   * @zh 位于标题区尾部的控件——菜单按钮、关闭控件或徽章。始终顶部对齐且不会被挤压；标题过长时会转为换行。
   */
  action?: ReactNode;
  /**
   * Header content — typically a `CardTitle` and a `CardDescription`.
   *
   * @zh 标题区域的内容——通常是一个 `CardTitle` 与一个 `CardDescription`。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the header's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在标题区自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * The card's title block: a tight stack for the title and its description,
 * with an optional trailing `action`.
 */
export function CardHeader({
  action,
  css,
  ref,
  children,
  ...restProps
}: CardHeaderProps) {
  return (
    <div {...restProps} ref={ref} css={[slotStyles.block, styles.header, css]}>
      <div css={styles.headerText}>{children}</div>
      {/* Truthiness: `action={cond && <Button/>}` then renders no slot.
          `!= null` would keep an empty flex item and its gap. */}
      {action ? <div css={styles.headerAction}>{action}</div> : null}
    </div>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: space._2,
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    flexGrow: 1,
    // Let a long title wrap instead of forcing the header row wider.
    minInlineSize: 0,
  },
  headerAction: {
    flexShrink: 0,
  },
});
