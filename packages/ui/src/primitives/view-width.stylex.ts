import * as stylex from "@stylexjs/stylex";

/**
 * The three forms of a `TabView`, by its own width. Below 34rem, a tab bar
 * floats over the bottom of the view. From 34rem, a rail of icons holds the
 * destinations. From 48rem, the sidebar holds them, each a row of an icon and
 * a label. 48rem is also where the list of a `NavigationSplitView` shows beside
 * its content (`splitViewQueries.contentBesideSidebar`), and the sidebar then
 * takes no width beside that view, so the two agree at each width. 34rem is
 * 30rem plus the rail, so a view beside the rail is never as narrow as a phone.
 * Below 72rem, the sidebar gives way to the rail while a detail shows beside
 * the content, and from 72rem the sidebar, the content and the detail all fit.
 *
 * The view measures its own width, not the screen's, so a `TabView` in a
 * frame, such as a demo, takes the form that fits the frame, and content in
 * it can follow with these queries. Outside a `TabView`, no query holds.
 */
export const tabViewWidth = stylex.defineConsts({
  bar: "@container tab-view (width < 34rem)",
  fromRail: "@container tab-view (width >= 34rem)",
  rail: "@container tab-view (34rem <= width < 48rem)",
  belowSidebar: "@container tab-view (width < 48rem)",
  sidebarNarrow: "@container tab-view (48rem <= width < 72rem)",
  sidebarWide: "@container tab-view (width >= 72rem)",
});
