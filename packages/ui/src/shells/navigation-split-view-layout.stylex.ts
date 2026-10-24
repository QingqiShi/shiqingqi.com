import * as stylex from "@stylexjs/stylex";

/**
 * The widths of the columns of a `NavigationSplitView`. The content column
 * takes the rest of the view.
 *
 * @internal
 */
export const splitViewWidths = stylex.defineConsts({
  sidebar: "21.25rem",
  collapsedSidebar: "4.75rem",
  detail: "24rem",
});

/**
 * The bands of view width in which a `NavigationSplitView` keeps one
 * composition. Without a detail beside the content, the sidebar shows full
 * where the content keeps at least 24.75rem beside it, collapsed where the
 * view is wider than a phone, and not at all on a phone, where the content
 * fills the view. `detailBeside` is where the detail fits beside the
 * collapsed sidebar and at least 20rem of content. The view measures the
 * same width in script, `DETAIL_BESIDE_MIN_REM` in
 * `navigation-split-view.tsx`, and shows the detail in a sheet below it.
 *
 * @internal
 */
export const splitViewQueries = stylex.defineConsts({
  /** The content fills the view, as on a phone. */
  contentAlone: "@container (width < 30rem)",
  /** The collapsed sidebar and the content. */
  contentBesideCollapsed: "@container (30rem <= width < 46rem)",
  /** The full sidebar and the content. */
  contentBesideSidebar: "@container (width >= 46rem)",
  /** The detail fits beside the collapsed sidebar and the content. */
  detailBeside: "@container (width >= 48.75rem)",
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
