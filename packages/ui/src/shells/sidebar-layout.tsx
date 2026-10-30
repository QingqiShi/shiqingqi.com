"use client";

import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../actions/button.tsx";
import { breakpoints } from "../breakpoints.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { MD_QUERY } from "../md-query.ts";
import {
  controlHeight,
  layer,
  layout,
  rhythm,
  space,
} from "../tokens.stylex.ts";
import { Drawer } from "./drawer.tsx";
import { headerControlsTokens } from "./header-controls.stylex.ts";
import { sidebarLayoutTokens } from "./sidebar-layout.stylex.ts";

// Default width of the navigation rail on wider viewports — wide enough for
// nav labels to fit on one line, even with a scrollbar's gutter. `rem`-based,
// so the rail grows with the user's font size (WCAG 1.4.4) instead of
// wrapping labels.
const DEFAULT_SIDEBAR_INLINE_SIZE = space._13;

interface SidebarLayoutOwnProps {
  /**
   * Navigation content, rendered in the sticky rail on wider viewports and in
   * the drawer on mobile. Scrolls independently when it outgrows the viewport.
   *
   * @zh 导航内容，宽视口下渲染于粘性侧栏中，移动端渲染于抽屉内；内容超出视口时可独立滚动。
   */
  sidebar: ReactNode;
  /**
   * Title region — rendered at the top of the rail and at the top of the
   * drawer. With `mobileSidebar="hidden"` there is no drawer, so it shows
   * only in the rail. It starts on the text edge of the nav, so an icon tile
   * in it lines up with the icons of the rows. Put controls such as a home
   * link in `sidebarFooter`.
   *
   * @zh 标题区域——显示在侧栏顶部与抽屉顶部。当 `mobileSidebar` 为 `"hidden"` 时没有抽屉，因此只显示在侧栏中。它从导航的文字边缘开始，因此其中的图标方块与各行的图标对齐。首页链接等控件请放在 `sidebarFooter` 中。
   */
  sidebarHeader?: ReactNode;
  /**
   * Utility region pinned to the bottom edge of the rail and the drawer —
   * theme toggles, language pickers, and similar app-level controls.
   *
   * @zh 固定在侧栏与抽屉底部边缘的实用区域——主题切换、语言选择等应用级控件。
   */
  sidebarFooter?: ReactNode;
  /**
   * Content column, capped to a readable width and centred beside the rail.
   *
   * @zh 内容列，限制在可读宽度内并在侧栏旁居中。
   */
  children: ReactNode;
  /**
   * Caps the centered content column. Defaults to the shared site content
   * width.
   *
   * @zh 限制居中内容列的宽度。默认使用站点共享的内容宽度。
   */
  contentMaxInlineSize?: string;
  /**
   * Inline size of the rail column on wider viewports.
   *
   * @zh 宽视口下侧栏列的行内尺寸。 @default space._13 (15rem)
   */
  sidebarInlineSize?: string;
  /**
   * Landmark element for the content region. Use `"main"` (the default) for the
   * page's primary content, or `"div"` when the shell is nested inside a surface
   * that already owns the `<main>` landmark.
   *
   * @zh 内容区域的地标元素。使用 `main`（默认）承载页面主内容；当骨架嵌套在已拥有 `<main>` 地标的表面内时，使用 `div`。 @default "main"
   */
  as?: "main" | "div";
}

type SidebarLayoutMobileProps =
  | {
      /**
       * Where the rail goes below `md`. `"drawer"` puts it behind a menu
       * button that floats at the top-end corner of the screen. `"hidden"`
       * removes the button and the drawer. Either way the content starts at
       * the top of the screen, below the safe area. Use `"hidden"` for an app
       * whose own mobile navigation, such as a tab bar, already holds the
       * rail's content.
       *
       * @zh `md` 以下侧栏的去向。`"drawer"` 将其收进悬浮在屏幕顶部末端角落的菜单按钮之后；`"hidden"` 去掉该按钮与抽屉。两种情况下内容都从屏幕顶部（安全区域之下）开始。已有自己移动端导航（例如标签栏）承载侧栏内容的应用使用 `"hidden"`。 @default "drawer"
       */
      mobileSidebar?: "drawer";
      /**
       * Accessible name for the mobile menu button and the open drawer dialog.
       * The package ships no i18n, so the consumer supplies the localised
       * string. Required unless `mobileSidebar` is `"hidden"`.
       *
       * @zh 移动端菜单按钮与打开的抽屉对话框的无障碍名称。本包不内置 i18n，请由调用方提供本地化字符串。除非 `mobileSidebar` 为 `"hidden"`，否则必填。
       */
      menuLabel: string;
      /**
       * Accessible label for the drawer's close button. Required unless
       * `mobileSidebar` is `"hidden"`.
       *
       * @zh 抽屉关闭按钮的无障碍标签。除非 `mobileSidebar` 为 `"hidden"`，否则必填。
       */
      closeLabel: string;
    }
  | {
      mobileSidebar: "hidden";
      menuLabel?: undefined;
      closeLabel?: undefined;
    };

type SidebarLayoutProps = SidebarLayoutOwnProps & SidebarLayoutMobileProps;

/**
 * App-density page shell: a persistent navigation rail beside a centered
 * content column on wider viewports, collapsing on mobile into a floating
 * menu button at the top-end corner that opens the rail as a drawer
 * (focus-trapped, scroll-locked, dismissed by Escape, backdrop, or following
 * a link). With `mobileSidebar="hidden"` there is no menu button or drawer,
 * and the rail shows from `md` up.
 *
 * The menu button floats over the inline-end corner of the content's first
 * row. The shell publishes the width it takes as
 * `headerControlsTokens.inlineEndClearance`, so that a first row, such as a
 * page title or a breadcrumb, can keep clear of it. It is `0px` where no
 * button floats.
 *
 * The rail sets the spaces of the nav, and the gaps and edges around the
 * header and the footer. The caller sets only the space inside the header and
 * the footer. Put a `NavList` in `sidebar`. The header and the footer are
 * `rhythm.item` from the nav, and the rail inset from the edges of the rail.
 * The fills of the nav and the boxes of the footer controls start on one box
 * edge. The header, the section labels and the content of the rows start on
 * one text edge, the inline padding of a `NavLink` after it.
 *
 * The rail fills the viewport's height (capped at its container's), so the
 * shell works in any bounded box, not just the page root. Such a box must be
 * the containing block for fixed descendants (for example with `transform` or
 * `contain: layout`), because the menu button, the drawer, and the rail's
 * footer from `md` up are fixed. Otherwise they go to the viewport's edges.
 * A box that is not at the edges of the screen also sets the safe-area
 * insets of `sidebarLayoutTokens` to `0px`, so the chrome does not keep clear
 * of a notch or a home indicator that is not there.
 */
export function SidebarLayout({
  sidebar,
  sidebarHeader,
  sidebarFooter,
  children,
  contentMaxInlineSize,
  sidebarInlineSize,
  as = "main",
  ...mobile
}: SidebarLayoutProps) {
  const railColumnSize = sidebarInlineSize ?? DEFAULT_SIDEBAR_INLINE_SIZE;
  const drawer =
    mobile.mobileSidebar === "hidden"
      ? ({ hasDrawer: false } as const)
      : ({
          hasDrawer: true,
          menuLabel: mobile.menuLabel,
          closeLabel: mobile.closeLabel,
        } as const);
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen,
    dialogRef: drawerRef,
    onClose: () => {
      setIsOpen(false);
    },
  });

  // If the viewport crosses `md` while open, CSS morphs the drawer into the
  // rail, so this effect must drop the open state too. Otherwise the scroll
  // lock and focus trap keep acting on what is now a plain column.
  useEffect(() => {
    if (!isOpen) return;
    const mediaQueryList = window.matchMedia(MD_QUERY);
    const closeOnDesktop = () => {
      if (mediaQueryList.matches) setIsOpen(false);
    };
    closeOnDesktop();
    mediaQueryList.addEventListener("change", closeOnDesktop);
    return () => {
      mediaQueryList.removeEventListener("change", closeOnDesktop);
    };
  }, [isOpen]);

  // Hand-rolled, not `react-remove-scroll`: a plain body style keeps the DOM
  // structure identical across open/close. This keeps ancestors like
  // `<ViewTransition>` undisturbed, and the drawer's own nav still scrolls
  // since only the body is clamped.
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const content = (
    <div
      css={[
        styles.content,
        contentMaxInlineSize
          ? dynamicStyles.maxInlineSize(contentMaxInlineSize)
          : null,
      ]}
    >
      {children}
    </div>
  );

  return (
    <div
      css={[
        styles.root,
        !drawer.hasDrawer && styles.rootWithoutMenu,
        dynamicStyles.columns(railColumnSize),
      ]}
    >
      {drawer.hasDrawer ? (
        <div css={styles.menu}>
          <EffectCarrier value="viewport">
            <Button
              icon={<ListIcon weight="bold" />}
              aria-label={drawer.menuLabel}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              onClick={() => {
                setIsOpen(true);
              }}
            />
          </EffectCarrier>
        </div>
      ) : null}
      <Drawer
        {...drawer}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        drawerRef={drawerRef}
        railColumnSize={railColumnSize}
        sidebarHeader={sidebarHeader}
        sidebarFooter={sidebarFooter}
      >
        {sidebar}
      </Drawer>
      {as === "main" ? (
        <main css={styles.contentArea}>{content}</main>
      ) : (
        <div css={styles.contentArea}>{content}</div>
      )}
    </div>
  );
}

const styles = stylex.create({
  root: {
    // The strip of the menu button, published so sticky chrome parks under
    // it. Nothing floats over the page at `md`+, where the rail sits beside
    // the content instead.
    [headerControlsTokens.clearance]: {
      default: `calc(${controlHeight.md} + 2 * ${space._3} + ${sidebarLayoutTokens.safeAreaTop})`,
      [breakpoints.md]: "0px",
    },
    [headerControlsTokens.inlineEndClearance]: {
      default: `calc(${controlHeight.md} + ${rhythm.tight})`,
      [breakpoints.md]: "0px",
    },
    display: "grid",
    alignItems: { default: "start", [breakpoints.md]: "stretch" },
    gap: { default: rhythm.group, [breakpoints.md]: 0 },
    paddingBlockStart: {
      default: `calc(${space._4} + ${sidebarLayoutTokens.safeAreaTop})`,
      [breakpoints.md]: 0,
    },
    paddingBlockEnd: {
      default: `calc(${space._8} + ${sidebarLayoutTokens.safeAreaBottom})`,
      [breakpoints.md]: 0,
    },
    paddingInlineStart: {
      default: `calc(${space._3} + ${sidebarLayoutTokens.safeAreaLeft})`,
      [breakpoints.md]: 0,
    },
    paddingInlineEnd: {
      default: `calc(${space._3} + ${sidebarLayoutTokens.safeAreaRight})`,
      [breakpoints.md]: 0,
    },
    // md+ fills the container's height, so the rail and its footer track a
    // bounded container. This is inert at the page root, where height is
    // indefinite and the rail's own height sets the row instead.
    // `minBlockSize: 0` lets it shrink as a grid item.
    blockSize: { [breakpoints.md]: "100%" },
    minBlockSize: { [breakpoints.md]: 0 },
    gridTemplateRows: { [breakpoints.md]: "minmax(0, 1fr)" },
  },
  // Nothing floats over the page, so sticky chrome parks under the status
  // bar.
  rootWithoutMenu: {
    [headerControlsTokens.clearance]: {
      default: sidebarLayoutTokens.safeAreaTop,
      [breakpoints.md]: "0px",
    },
    [headerControlsTokens.inlineEndClearance]: "0px",
  },
  // Fixed, not sticky, since a sticky grid item cannot escape its own-height
  // row. The box is only as large as the button, thus it is smaller than the
  // screen on both axes, and iOS Safari does not tint its status bar from it.
  menu: {
    display: { default: "flex", [breakpoints.md]: "none" },
    position: "fixed",
    insetBlockStart: `calc(${space._3} + ${sidebarLayoutTokens.safeAreaTop})`,
    insetInlineEnd: `calc(${space._3} + ${sidebarLayoutTokens.safeAreaRight})`,
    zIndex: layer.header,
  },
  contentArea: {
    minInlineSize: 0,
    // md+ owns its own padding; mobile insets come from the root frame. The
    // inline-start value is the gutter between rail and content.
    paddingBlockStart: { default: 0, [breakpoints.md]: space._4 },
    paddingBlockEnd: {
      default: 0,
      [breakpoints.md]: `calc(${space._8} + ${sidebarLayoutTokens.safeAreaBottom})`,
    },
    paddingInlineStart: { default: 0, [breakpoints.md]: space._8 },
    paddingInlineEnd: {
      default: 0,
      [breakpoints.md]: `calc(${space._6} + ${sidebarLayoutTokens.safeAreaRight})`,
    },
  },
  content: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    minInlineSize: 0,
  },
});

// StyleX generates the CSS variable, so the rail width participates in the
// responsive grid track. The value is a runtime arg, defaulted by the caller.
const dynamicStyles = stylex.create({
  columns: (sidebarInlineSize: string) => ({
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `${sidebarInlineSize} minmax(0, 1fr)`,
    },
  }),
  maxInlineSize: (maxInlineSize: string) => ({ maxInlineSize }),
});
