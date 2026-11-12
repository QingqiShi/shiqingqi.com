import { createContext, use, type ReactNode } from "react";

/**
 * What the list of a screen draws around itself where it is the sidebar: in a
 * `TabView`, the destinations of that view, and outside one, the list's own
 * `header` and `footer`.
 *
 * @internal
 */
export interface TabViewSidebarNav {
  /** What shows above the list, such as the `header` and the destinations. */
  top: ReactNode;
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
