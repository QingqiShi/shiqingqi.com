/**
 * The cookie that holds whether the visitor collapsed the sidebar: `1` while
 * it is collapsed. Where the server can read it, pass its value as the
 * `defaultCollapsed` of the `TabView`, or of the `sidebar` of a
 * `NavigationSplitView` outside one, so that the first paint has the visitor's
 * choice.
 */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar_collapsed";
