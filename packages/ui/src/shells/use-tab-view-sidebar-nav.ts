import { createContext, use, type ReactNode } from "react";

/**
 * What the list of a screen draws around itself where it is the sidebar: in a
 * `TabView`, the `header`, the destinations and the `footer` of that view, and
 * outside one, the list's own `header` and `footer`.
 *
 * @internal
 */
export interface TabViewSidebarNav {
  /** What stays above the list while the list scrolls under it, such as the `header`. */
  top: ReactNode;
  /**
   * What scrolls with the list, above it: the destinations. They are rows of
   * text as the list is, so the list must not scroll behind them.
   */
  list?: ReactNode;
  /** What shows under the list, such as the `footer`, or null. */
  bottom: ReactNode;
  /** Whether the visitor collapsed the sidebar. */
  isCollapsed: boolean;
}

/** @internal */
export const TabViewSidebarNavContext = createContext<TabViewSidebarNav | null>(
  null,
);

/**
 * The destinations of the `TabView` around, or null outside one.
 *
 * @internal
 */
export function useTabViewSidebarNav() {
  return use(TabViewSidebarNavContext);
}
