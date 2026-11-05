import { useLayoutEffect, useState } from "react";
import {
  pxToRem,
  STACK_PAGE_BELOW_REM,
  STACKED_BELOW_REM,
} from "../split-view-motion/is-view-stacked.ts";

/**
 * The narrowest view, in rem, where the detail shows beside the content:
 * the collapsed sidebar, 20rem of content, the detail and the gaps around
 * the islands. It is the same width as `splitViewQueries.detailBeside`.
 */
const DETAIL_BESIDE_MIN_REM = 50.75;

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
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.borderBoxSize[0].inlineSize;
      if (width === 0) return;
      setReached(
        VIEW_WIDTHS_REM.filter((rem) => width * remPerPx >= rem).length,
      );
    });
    observer.observe(view);
    return () => {
      observer.disconnect();
    };
  }, [view]);
  return reached;
}
