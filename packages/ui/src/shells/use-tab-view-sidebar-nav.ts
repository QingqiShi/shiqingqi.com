import { createContext, use, type ReactNode } from "react";
import type { MotionValue } from "../motion/create-motion-value.ts";

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
  /**
   * The last press of the button that collapses the sidebar of the `TabView`,
   * and where the sidebar goes. A view in the content moves its content then.
   */
  press?: { id: number; to: "in" | "out" } | null;
  /**
   * How far, in px, the content of the `TabView` showed from its place of now
   * before that press: the view in it moved that far with it.
   */
  pressShift?: () => number;
  /**
   * Takes the value that moves the content of `view` after that press, so
   * that the sidebar of the `TabView` moves with it.
   */
  follow?: (view: HTMLElement, slide: MotionValue | null) => void;
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
