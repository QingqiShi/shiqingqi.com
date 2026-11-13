import { useLayoutEffect, useState } from "react";
import {
  pxToRem,
  STACK_PAGE_BELOW_REM,
  STACKED_BELOW_REM,
} from "../split-view-motion/is-view-stacked.ts";

/**
 * The narrowest view, in rem, where the detail shows beside the content:
 * 4.75rem that a sidebar can keep, 20rem of content, the detail and 2rem of
 * room. It is the same width as `splitViewQueries.detailBeside`.
 */
const DETAIL_BESIDE_MIN_REM = 50.75;

/**
 * The narrowest `TabView`, in rem, where the detail of a view in it shows
 * beside the content: `DETAIL_BESIDE_MIN_REM` and the rail of icons, which the
 * `TabView` shows while the detail does. The view is wider while the detail is
 * in a sheet, as the sidebar then takes no width beside it, so its own width
 * cannot decide this.
 */
const DETAIL_BESIDE_MIN_TAB_VIEW_REM = DETAIL_BESIDE_MIN_REM + 4;

/** The widths of a view, in rem and in order, where its columns change. */
const VIEW_WIDTHS_REM = [
  STACKED_BELOW_REM,
  STACK_PAGE_BELOW_REM,
  DETAIL_BESIDE_MIN_REM,
];

/**
 * How many of `VIEW_WIDTHS_REM` the view reaches: `null` until it is measured.
 *
 * @internal
 */
export function useViewWidthsReached(view: HTMLElement | null) {
  const [reached, setReached] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (view === null || typeof ResizeObserver === "undefined") return;
    const remPerPx = pxToRem(1);
    const tabView = view.closest("[data-tab-view]");
    const measure = () => {
      const width = view.getBoundingClientRect().width;
      if (width === 0) return;
      const reached = VIEW_WIDTHS_REM.filter(
        (rem) => width * remPerPx >= rem,
      ).length;
      if (tabView === null || reached < 2) {
        setReached(reached);
        return;
      }
      const tabViewWidth = tabView.getBoundingClientRect().width;
      setReached(
        tabViewWidth * remPerPx >= DETAIL_BESIDE_MIN_TAB_VIEW_REM ? 3 : 2,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    if (tabView !== null) observer.observe(tabView);
    return () => {
      observer.disconnect();
    };
  }, [view]);
  return reached;
}
