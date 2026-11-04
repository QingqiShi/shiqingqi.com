import * as stylex from "@stylexjs/stylex";

/**
 * The fixed widths of the columns of a `NavigationSplitView`. The full sidebar
 * takes `splitViewTokens.sidebarInlineSize`, and the content column takes the
 * rest of the view.
 *
 * @internal
 */
export const splitViewWidths = stylex.defineConsts({
  collapsedSidebar: "4.75rem",
  detail: "24rem",
});

/**
 * The bands of view width in which a `NavigationSplitView` keeps one
 * composition. Without a detail beside the content, the sidebar shows full
 * where the content keeps at least 25.25rem beside it, collapsed where the
 * view is wider than a phone, and not at all on a phone, where the content
 * fills the view. The full sidebar starts at the width of `tabViewQueries.rail`,
 * so that it never shows beside a tab bar: at that width the rail takes
 * `tabViewTokens.railInlineSize` from the view, and the view stacks again. `detailBeside` is where the detail fits beside the
 * collapsed sidebar and at least 20rem of content. Each width also holds
 * the gaps around the islands, 0.5rem each. The view measures the same
 * width in script, `DETAIL_BESIDE_MIN_REM` in `navigation-split-view.tsx`,
 * and shows the detail in a sheet below it.
 *
 * @internal
 */
export const splitViewQueries = stylex.defineConsts({
  /** The content fills the view, as on a phone. */
  contentAlone: "@container (width < 30rem)",
  /** Not `contentAlone`, for a value that only this width sets. */
  besideOthers: "@container (width >= 30rem)",
  /** The collapsed sidebar and the content. */
  contentBesideCollapsed: "@container (30rem <= width < 48rem)",
  /** The full sidebar and the content. */
  contentBesideSidebar: "@container (width >= 48rem)",
  /** Not `contentBesideSidebar`, for a value that only this width sets. */
  noSidebarBeside: "@container (width < 48rem)",
  /** The detail fits beside the collapsed sidebar and the content. */
  detailBeside: "@container (width >= 50.75rem)",
  /**
   * The view fills a screen narrower than 30rem, as on a phone. There the page
   * scrolls the content, so that it goes under the status bar of the browser. It
   * queries the box around the view, a `TabView` or else a box of the view's own,
   * so the view itself can take it.
   */
  pageScrolls: "@container split-view-screen (width < 30rem)",
});

/**
 * The `display` of `StackedOnly`, `UnlessStacked` and `UnlessFullSidebar`, which the view and
 * its columns set for each composition: `contents` where the children show,
 * `none` where they do not.
 *
 * @internal
 */
export const splitViewDisplay = stylex.defineVars({
  stacked: "none",
  unstacked: "contents",
  noFullSidebar: "contents",
});
