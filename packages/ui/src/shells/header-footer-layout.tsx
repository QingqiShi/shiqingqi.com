import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import {
  pageColumn as pageColumnStyles,
  pageColumnTokens,
  pageGutter,
} from "../primitives/page-column.stylex.ts";
import { BlurPlane, BlurPlaneProvider } from "../surfaces/blur-plane.tsx";
import { layer, space } from "../tokens.stylex.ts";
import { HeaderControls } from "./header-controls.tsx";

interface HeaderFooterLayoutProps {
  /**
   * Start (leading) floating group at the top of the page — typically a back
   * or home affordance. Only the controls accept pointer events, so the group
   * never blocks the content scrolling beneath it.
   *
   * @zh 页面顶部起始（前置）的悬浮控件组——通常是返回或首页入口。只有控件本身接收指针事件，因此该组不会阻挡下方内容的滚动。
   */
  headerStart?: ReactNode;
  /**
   * End (trailing) floating group at the top of the page — typically utility
   * controls such as a theme toggle or language picker.
   *
   * @zh 页面顶部的结尾悬浮控件组——通常是主题切换、语言选择等实用控件。
   */
  headerEnd?: ReactNode;
  /**
   * Full-bleed decoration behind the content and beneath the header controls
   * — gradients, glows, texture. Pointer-transparent and clipped to the
   * shell; pass positioned elements, since the slot fills the whole shell.
   *
   * @zh 内容与页头控件下方的满幅装饰——渐变、光晕、纹理。不接收指针事件，并裁剪至骨架范围；由于该插槽铺满整个骨架，请传入自带定位的元素。
   */
  background?: ReactNode;
  /**
   * Footer element, rendered at the bottom of the page in the page column.
   * Pass a `<footer>` (e.g. the site footer);
   * the shell doesn't add its own landmark, so the element you pass owns the
   * `contentinfo` role.
   *
   * @zh 页脚元素，渲染在页面底部的页面栏内。传入一个 `<footer>`（例如站点页脚）；骨架不添加自己的地标，因此你传入的元素拥有 `contentinfo` 角色。
   */
  footer?: ReactNode;
  /**
   * Page content. Flows up past the header controls by default, so a hero or
   * backdrop bleeds to the top edge; a text-first page adds its own
   * clearance.
   *
   * @zh 页面内容。默认向上延伸至页头控件之下，主视觉或背景可铺到顶部边缘；以文字为主的页面自行留出顶部间距。
   */
  children: ReactNode;
  /**
   * Sets the content in the page column, on the same edges as the header
   * controls and the footer. Left off, the content is full-bleed and manages
   * its own width (e.g. a media hero or an app canvas).
   *
   * @zh 将内容放入页面栏，与页头控件和页脚对齐同一边缘。不启用时内容为满幅并自行管理宽度（例如媒体主视觉或应用画布）。
   */
  pageColumn?: boolean;
  /**
   * Narrows the page column below the site default (prose-heavy pages). The
   * width includes the page gutters. Implies `pageColumn`.
   *
   * @zh 将页面栏收窄至低于站点默认值（适用于文字密集的页面）。该宽度包含页面边距。隐含启用 `pageColumn`。
   */
  contentMaxInlineSize?: string;
  /**
   * Sets the header controls on the wide page column, one page gutter from
   * the screen edges, so they line up with a gallery that runs wide
   * (`pageColumn.wide`). The content and the footer keep their own column.
   *
   * @zh 将页头控件放在宽页面栏上，离屏幕边缘一个页面边距，与铺满宽屏的画廊（`pageColumn.wide`）对齐。内容与页脚保留各自的页面栏。
   */
  wideHeader?: boolean;
  /**
   * Landmark element for the content region. Use `"main"` (the default) for the
   * page's primary content, or `"div"` when the shell is nested inside a surface
   * that already owns the `<main>` landmark.
   *
   * @zh 内容区域的地标元素。使用 `main`（默认）承载页面主内容；当骨架嵌套在已拥有 `<main>` 地标的表面内时，使用 `div`。 @default "main"
   */
  as?: "main" | "div";
}

/**
 * Reading-and-content page shell: floating header control groups at the ends
 * of the site's centered measure, an optional full-bleed background, content
 * that flows under the header, and an optional footer at the end of the page.
 *
 * This is the shell behind the site's header/footer pages; reach for
 * `SidebarLayout` instead for dense, app-like pages with their own
 * navigation — a page uses one shell or the other, never both.
 */
export function HeaderFooterLayout({
  headerStart,
  headerEnd,
  background,
  footer,
  children,
  pageColumn,
  contentMaxInlineSize,
  wideHeader,
  as = "main",
}: HeaderFooterLayoutProps) {
  const isColumn = pageColumn === true || contentMaxInlineSize != null;
  const contentCss = [
    styles.content,
    isColumn && pageColumnStyles.base,
    contentMaxInlineSize
      ? dynamicStyles.columnInlineSize(contentMaxInlineSize)
      : null,
  ];
  const content = (
    <>
      <BlurPlane />
      {children}
    </>
  );
  const contentBody =
    as === "main" ? (
      <main css={contentCss}>{content}</main>
    ) : (
      <div css={contentCss}>{content}</div>
    );

  return (
    <BlurPlaneProvider>
      <div css={styles.root}>
        {background != null && (
          <div css={styles.background} aria-hidden="true">
            {background}
          </div>
        )}
        <header css={[styles.header, wideHeader && pageColumnStyles.wide]}>
          {headerStart != null && (
            <HeaderControls css={styles.headerStart}>
              {headerStart}
            </HeaderControls>
          )}
          {headerEnd != null && (
            <HeaderControls css={styles.headerEnd}>{headerEnd}</HeaderControls>
          )}
        </header>
        {contentBody}
        {footer != null && (
          <div css={[styles.footer, pageColumnStyles.base]}>{footer}</div>
        )}
      </div>
    </BlurPlaneProvider>
  );
}

// The scroll lock reports here the width of the scrollbar it removes.
const SCROLLBAR = "var(--removed-body-scroll-bar-size, 0px)";

const styles = stylex.create({
  root: {
    // Published so sticky page chrome (e.g. a filter bar) can sit below the
    // header without restating its size.
    "--header-controls-clearance": `calc(${space._10} + env(safe-area-inset-top))`,
    // Do not isolate this box. The header controls must stack with the effect
    // layer, which is outside the shell, so that effects stay under them.
    position: "relative",
    display: "flex",
    flexDirection: "column",
    minBlockSize: "100dvh",
  },
  // This box can clip: it sits beside the header controls' blur, not above
  // it, so the clip cannot strip the blur's mask.
  background: {
    position: "absolute",
    inset: 0,
    zIndex: layer.base,
    pointerEvents: "none",
    overflow: "hidden",
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // No box of its own: a near-full-width fixed header flattens the iOS
  // Safari status bar. See "Progressive blur" in `contexts/design-system/CONTEXT.md`.
  header: {
    display: "contents",
  },
  // The controls sit on the edges of the page column. They are fixed, so
  // `100%` is the viewport, which grows by the scrollbar that the scroll lock
  // removes. Only headerEnd also moves in by that width, because the body
  // takes it as padding on that side.
  headerStart: {
    insetInlineStart: `max(${pageGutter.inlineStart}, calc((100% - ${SCROLLBAR} - ${pageColumnTokens.inlineSize}) / 2 + ${space._3}))`,
  },
  headerEnd: {
    insetInlineEnd: `calc(max(${pageGutter.inlineEnd}, calc((100% - ${SCROLLBAR} - ${pageColumnTokens.inlineSize}) / 2 + ${space._3})) + ${SCROLLBAR})`,
  },
  // No top offset: heroes and backdrops bleed under the controls; pages that
  // want clearance add their own.
  content: {
    position: "relative",
    zIndex: layer.content,
    flexGrow: 1,
    minInlineSize: 0,
  },
  footer: {
    position: "relative",
    zIndex: layer.content,
  },
});

const dynamicStyles = stylex.create({
  columnInlineSize: (inlineSize: string) => ({
    [pageColumnTokens.inlineSize]: inlineSize,
  }),
});
