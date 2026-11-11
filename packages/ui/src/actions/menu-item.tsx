"use client";

import * as stylex from "@stylexjs/stylex";
import { use, type ComponentProps, type ReactNode } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { quietSurface } from "../primitives/quiet-surface.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { selectedTokens } from "../primitives/selected.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import {
  controlHeight,
  controlSize,
  opacity,
  rhythm,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { MenuPopupRoleContext } from "./menu-popup-role-context.ts";

interface MenuItemBaseProps {
  /**
   * The item's label.
   *
   * @zh 菜单项的标签。
   */
  children: ReactNode;
  /**
   * Muted text at the end of the row, such as the date a choice stands for.
   * It is part of the item's name.
   *
   * @zh 行尾的弱化文字，例如某个选项所代表的日期。它是菜单项名称的一部分。
   */
  trailing?: ReactNode;
  /**
   * Marks the item as the value in force, with `aria-current`, and fills it.
   * It stays in the focus order, so a screen reader names it as current. A
   * current link does not go anywhere on a click or on Enter, because it
   * leads where the visitor already is.
   *
   * @zh 以 `aria-current` 标记当前生效的选项，并为其填充底色。它仍在焦点顺序中，屏幕阅读器会读出它是当前项。当前项若是链接，点击或按 Enter 时都不会跳转，因为它指向访客已在的位置。
   */
  current?: boolean;
  /**
   * `"destructive"` marks an action that destroys something: the label and the
   * hover fill turn destructive, as on a `ghost` `Button` with `intent="destructive"`.
   *
   * @zh `"destructive"` 标记会销毁内容的操作：标签和悬停填充变为危险色，与 `intent="destructive"` 的 `ghost` `Button` 一致。
   */
  intent?: "destructive";
  /**
   * Row height. `"md"` matches a `md` control; `"sm"` is for a long menu of
   * many commands. Under a coarse pointer each row is at least 44px tall.
   *
   * @default "md"
   * @zh 行高。`"md"` 与 `md` 尺寸的控件同高；`"sm"` 适用于命令很多的长菜单。粗指针下每行至少 44px 高。
   */
  size?: "sm" | "md";
  /**
   * StyleX styles merged over the item's own, composed last.
   *
   * @zh 合并在菜单项自身样式之上的 StyleX 样式，最后合成。
   */
  css?: StyleProp;
}

type MenuItemLinkProps = MenuItemBaseProps & {
  /**
   * Renders the item as a plain `<a>` that the browser follows itself.
   *
   * @zh 将菜单项渲染为由浏览器自行跟随的原生 `<a>`。
   */
  href: string;
} & Omit<ComponentProps<"a">, "children" | "className" | "style" | "href">;

type MenuItemButtonProps = MenuItemBaseProps & {
  href?: undefined;
} & Omit<ComponentProps<"button">, "children" | "className" | "style">;

type MenuItemProps = MenuItemLinkProps | MenuItemButtonProps;

/**
 * One row of a menu: a command button, or a link with `href`. Inside a
 * `MenuButton` menu it takes `role="menuitem"`, so the arrow keys reach it;
 * in a `Popover` or a group popup it stays a plain button or link.
 */
export function MenuItem({
  children,
  trailing,
  current = false,
  intent,
  size = "md",
  css,
  ...elementProps
}: MenuItemProps) {
  const role = use(MenuPopupRoleContext) === "menu" ? "menuitem" : undefined;
  const ariaCurrent = current ? "true" : undefined;
  const content = <ItemContent trailing={trailing}>{children}</ItemContent>;
  if (elementProps.href === undefined) {
    const { href: _href, ...buttonProps } = elementProps;
    return (
      <button
        type="button"
        role={role}
        aria-current={ariaCurrent}
        {...buttonProps}
        css={[buttonReset.base, itemCss({ intent, size }), css]}
      >
        {content}
      </button>
    );
  }
  const { onClick, ...linkProps } = elementProps;
  return (
    <a
      role={role}
      aria-current={ariaCurrent}
      {...linkProps}
      onClick={(event) => {
        onClick?.(event);
        if (current) event.preventDefault();
      }}
      css={[itemCss({ intent, size }), current && styles.currentLink, css]}
    >
      {content}
    </a>
  );
}

function itemCss({
  intent,
  size,
}: {
  intent: "destructive" | undefined;
  size: "sm" | "md";
}) {
  return [
    typeRole.control,
    corner.radius_1,
    a11y.touchRow,
    quietSurface.interactive,
    styles.item,
    sizes[size],
    intent === "destructive" && styles.destructive,
  ];
}

function ItemContent({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing: ReactNode;
}) {
  return (
    <>
      <span css={styles.label}>{children}</span>
      {trailing === undefined || trailing === null ? null : (
        <span css={styles.trailing}>{trailing}</span>
      )}
    </>
  );
}

const styles = stylex.create({
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
    boxSizing: "border-box",
    inlineSize: "100%",
    paddingInline: controlSize._3,
    color: color.foreground,
    textAlign: "start",
    opacity: { default: null, ":disabled": opacity.disabled },
  },
  // It replaces the neutral fill of `quietSurface.interactive`. A destructive item
  // is never the current one, so the selected states are not repeated.
  destructive: {
    color: color.destructiveText,
    backgroundColor: {
      default: selectedTokens.rest,
      [pointer.canHover]: {
        default: null,
        ":hover": color.destructiveSubtle,
        ":active": color.destructiveSubtle,
        ":disabled:hover": selectedTokens.rest,
      },
      ":active": color.destructiveSubtle,
    },
  },
  currentLink: {
    cursor: "default",
  },
  label: {
    minInlineSize: 0,
  },
  trailing: {
    flexShrink: 0,
    color: color.mutedForeground,
  },
});

// Each size repeats the coarse-pointer floor of `a11y.touchRow`, because a
// later `minBlockSize` replaces all of its values.
const sizes = stylex.create({
  sm: {
    minBlockSize: {
      default: controlHeight.sm,
      [pointer.coarse]: `max(44px, ${controlHeight.sm})`,
    },
    paddingBlock: controlSize._1,
  },
  md: {
    minBlockSize: {
      default: controlHeight.md,
      [pointer.coarse]: `max(44px, ${controlHeight.md})`,
    },
    paddingBlock: controlSize._2,
  },
});
