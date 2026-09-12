import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { layer, layout, space } from "../../tokens.stylex.ts";
import { BlurPlane, BlurPlaneProvider } from "../surfaces/blur-plane.tsx";
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
   * Footer element, rendered at the bottom of the page in the same centered
   * measure as a reading column. Pass a `<footer>` (e.g. the site footer);
   * the shell doesn't add its own landmark, so the element you pass owns the
   * `contentinfo` role.
   *
   * @zh 页脚元素，渲染在页面底部，与阅读栏共享同一版心。传入一个 `<footer>`（例如站点页脚）；骨架不添加自己的地标，因此你传入的元素拥有 `contentinfo` 角色。
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
   * Caps the content into the site's default reading column — centred, with
   * reading gutters. Left off, the content is full-bleed and manages its own
   * width (e.g. a media hero or an app canvas).
   *
   * @zh 将内容限制在本站默认的阅读栏内——居中并带阅读边距。不启用时内容为满幅并自行管理宽度（例如媒体主视觉或应用画布）。
   */
  readingColumn?: boolean;
  /**
   * Narrows the reading column below the site default (prose-heavy pages).
   * Implies `readingColumn`.
   *
   * @zh 将阅读栏收窄至低于站点默认值（适用于文字密集的页面）。隐含启用 `readingColumn`。
   */
  contentMaxInlineSize?: string;
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
  readingColumn,
  contentMaxInlineSize,
  as = "main",
}: HeaderFooterLayoutProps) {
  const isColumn = readingColumn === true || contentMaxInlineSize != null;
  const contentCss = [
    styles.content,
    isColumn && styles.column,
    contentMaxInlineSize
      ? dynamicStyles.maxInlineSize(contentMaxInlineSize)
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
        <header css={styles.header}>
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
        {footer != null && <div css={styles.footer}>{footer}</div>}
      </div>
    </BlurPlaneProvider>
  );
}

const styles = stylex.create({
  // The scroll lock reports its removed scrollbar width here, so the floating
  // groups hold still instead of shifting when the scrollbar disappears.
  root: {
    "--header-controls-gutter": `calc(max(0px, (100% - var(--removed-body-scroll-bar-size, 0px) - ${layout.maxInlineSize}) / 2) + ${space._3})`,
    // Published so sticky page chrome (e.g. a filter bar) can sit below the
    // header without restating its size.
    "--header-controls-clearance": `calc(${space._10} + env(safe-area-inset-top))`,
    position: "relative",
    isolation: "isolate",
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
  // Only headerEnd also clears the removed scrollbar width; the gutter above
  // already accounts for it on the measure, not this edge.
  headerStart: {
    insetInlineStart:
      "calc(var(--header-controls-gutter) + env(safe-area-inset-left))",
  },
  headerEnd: {
    insetInlineEnd:
      "calc(var(--header-controls-gutter) + env(safe-area-inset-right) + var(--removed-body-scroll-bar-size, 0px))",
  },
  // No top offset: heroes and backdrops bleed under the controls; pages that
  // want clearance add their own.
  content: {
    position: "relative",
    zIndex: layer.content,
    flexGrow: 1,
    minInlineSize: 0,
  },
  column: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  footer: {
    position: "relative",
    zIndex: layer.content,
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
});

const dynamicStyles = stylex.create({
  maxInlineSize: (maxInlineSize: string) => ({ maxInlineSize }),
});
