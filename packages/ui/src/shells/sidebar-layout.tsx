"use client";

import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../actions/button.tsx";
import { breakpoints } from "../breakpoints.stylex.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { corner } from "../primitives/corner.stylex.ts";
import {
  color,
  layer,
  layout,
  rhythm,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { Drawer } from "./drawer.tsx";

// Default width of the navigation rail on wider viewports — wide enough for
// nav labels to fit on one line, even with a scrollbar's gutter. `rem`-based,
// so the rail grows with the user's font size (WCAG 1.4.4) instead of
// wrapping labels.
const DEFAULT_SIDEBAR_INLINE_SIZE = space._13;

// Derived from the breakpoint token so the JS check cannot drift from the CSS
// one. `matchMedia` needs the bare condition, but the StyleX const carries the
// `@media ` prefix.
const MD_MEDIA_QUERY = breakpoints.md.replace("@media ", "");

interface SidebarLayoutOwnProps {
  /**
   * Navigation content, rendered in the sticky rail on wider viewports and in
   * the drawer on mobile. Scrolls independently when it outgrows the viewport.
   *
   * @zh 导航内容，宽视口下渲染于粘性侧栏中，移动端渲染于抽屉内；内容超出视口时可独立滚动。
   */
  sidebar: ReactNode;
  /**
   * Title region — rendered at the top of the rail, in the collapsed mobile
   * bar, and at the top of the drawer. With `mobileSidebar="hidden"` there is
   * no mobile bar or drawer, so it shows only in the rail.
   *
   * @zh 标题区域——显示在侧栏顶部、收起的移动端悬浮条中，以及抽屉顶部。当 `mobileSidebar` 为 `"hidden"` 时没有移动端悬浮条和抽屉，因此只显示在侧栏中。
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
       * button in a floating bar at the top. `"hidden"` removes the bar and
       * the drawer, so the content starts at the top of the screen, below the
       * safe area. Use it for an app whose own mobile navigation, such as a
       * tab bar, already holds the rail's content.
       *
       * @zh `md` 以下侧栏的去向。`"drawer"` 将其收进顶部悬浮条的菜单按钮之后；`"hidden"` 去掉悬浮条与抽屉，内容从屏幕顶部（安全区域之下）开始。适用于已有自己移动端导航（例如标签栏）承载侧栏内容的应用。 @default "drawer"
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
 * content column on wider viewports, collapsing on mobile into a top bar whose
 * menu button opens the rail as a drawer (focus-trapped, scroll-locked,
 * dismissed by Escape, backdrop, or following a link). With
 * `mobileSidebar="hidden"` there is no mobile bar or drawer, and the rail
 * shows from `md` up.
 *
 * The rail fills the viewport's height (capped at its container's), so the
 * shell works in any bounded box, not just the page root.
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
    const mediaQueryList = window.matchMedia(MD_MEDIA_QUERY);
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
        !drawer.hasDrawer && styles.rootWithoutMobileBar,
        dynamicStyles.columns(sidebarInlineSize ?? DEFAULT_SIDEBAR_INLINE_SIZE),
      ]}
    >
      {drawer.hasDrawer ? (
        <div css={[corner.radius_round, styles.mobileBar]}>
          <div css={styles.mobileBarTitle}>{sidebarHeader}</div>
          <Button
            size="sm"
            look="ghost"
            icon={<ListIcon weight="bold" />}
            aria-label={drawer.menuLabel}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            onClick={() => {
              setIsOpen(true);
            }}
          />
        </div>
      ) : null}
      <Drawer
        {...drawer}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        drawerRef={drawerRef}
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
    // The strip the mobile pill bar occupies, published so sticky chrome
    // parks under it. Nothing floats over the page at `md`+, where the rail
    // sits beside the content instead.
    "--header-controls-clearance": {
      default: `calc(${space._10} + env(safe-area-inset-top))`,
      [breakpoints.md]: "0px",
    },
    display: "grid",
    alignItems: { default: "start", [breakpoints.md]: "stretch" },
    gap: { default: rhythm.group, [breakpoints.md]: 0 },
    // Mobile top padding clears the fixed pill bar, and then sets the content
    // `rhythm.item` below it.
    paddingBlockStart: {
      default: `calc(${space._10} + ${rhythm.item} + env(safe-area-inset-top))`,
      [breakpoints.md]: 0,
    },
    paddingBlockEnd: {
      default: `calc(${space._8} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: 0,
    },
    paddingInlineStart: {
      default: `calc(${space._3} + env(safe-area-inset-left))`,
      [breakpoints.md]: 0,
    },
    paddingInlineEnd: {
      default: `calc(${space._3} + env(safe-area-inset-right))`,
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
  // No bar floats over the page, so sticky chrome parks under the status
  // bar, and the content starts the md+ content gap below it.
  rootWithoutMobileBar: {
    "--header-controls-clearance": {
      default: "env(safe-area-inset-top)",
      [breakpoints.md]: "0px",
    },
    paddingBlockStart: {
      default: `calc(${space._4} + env(safe-area-inset-top))`,
      [breakpoints.md]: 0,
    },
  },
  // Fixed, not sticky, since a sticky grid item cannot escape its own-height
  // row. The shell's mobile block-start padding is sized to clear this bar.
  mobileBar: {
    display: { default: "flex", [breakpoints.md]: "none" },
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    position: "fixed",
    insetBlockStart: `calc(${space._2} + env(safe-area-inset-top))`,
    insetInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    insetInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
    zIndex: layer.header,
    padding: space._1,
    backgroundColor: color.bgSurface,
    boxShadow: shadow._2,
    minInlineSize: 0,
  },
  mobileBarTitle: {
    minInlineSize: 0,
  },
  contentArea: {
    minInlineSize: 0,
    // md+ owns its own padding; mobile insets come from the root frame. The
    // inline-start value is the gutter between rail and content.
    paddingBlockStart: { default: 0, [breakpoints.md]: space._4 },
    paddingBlockEnd: {
      default: 0,
      [breakpoints.md]: `calc(${space._8} + env(safe-area-inset-bottom))`,
    },
    paddingInlineStart: { default: 0, [breakpoints.md]: space._8 },
    paddingInlineEnd: {
      default: 0,
      [breakpoints.md]: `calc(${space._6} + env(safe-area-inset-right))`,
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
