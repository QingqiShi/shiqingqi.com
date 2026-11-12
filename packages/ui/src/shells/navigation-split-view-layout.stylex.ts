import * as stylex from "@stylexjs/stylex";

/**
 * The fixed widths of the columns of a `NavigationSplitView`. The sidebar
 * takes `splitViewTokens.sidebarInlineSize`, and the content column takes the
 * rest of the view.
 *
 * @internal
 */
export const splitViewWidths = stylex.defineConsts({
  detail: "24rem",
});

/**
 * The bands of view width in which a `NavigationSplitView` keeps one
 * composition. The sidebar shows beside the content from 48rem, where the
 * content keeps at least 25.25rem, and below that it is the first page of a
 * stack. 48rem is also the width where a `TabView` gives its
 * destinations to the sidebar and takes no width of its own, so the two
 * never disagree. `detailBeside` is where the detail fits beside at least
 * 20rem of content and the rail of a `TabView`. Each width also holds the
 * gaps around the islands, 0.5rem each. The view measures the same width in
 * script, `DETAIL_BESIDE_MIN_REM` in `split-view/use-view-widths-reached.ts`,
 * and shows the detail in a sheet below it.
 *
 * @internal
 */
export const splitViewQueries = stylex.defineConsts({
  /** The content fills the view, as on a phone. */
  contentAlone: "@container (width < 30rem)",
  /** Not `contentAlone`, for a value that only this width sets. */
  besideOthers: "@container (width >= 30rem)",
  /** The sidebar and the content. */
  contentBesideSidebar: "@container (width >= 48rem)",
  /** Not `contentBesideSidebar`, for a value that only this width sets. */
  noSidebarBeside: "@container (width < 48rem)",
  /** The detail fits beside the content. */
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
 * The `display` of `StackedOnly` and `UnlessStacked`, which the view and its
 * columns set for each composition: `contents` where the children show,
 * `none` where they do not.
 *
 * @internal
 */
export const splitViewDisplay = stylex.defineVars({
  stacked: "none",
  unstacked: "contents",
});
