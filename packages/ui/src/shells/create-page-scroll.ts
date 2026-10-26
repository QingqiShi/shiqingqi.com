import { scrollsBlock } from "../effect-layer/check-declared-carrier.ts";

/** How long, in ms, a scroll after a navigation starts does not count as the scroll of the page that shows. */
const HOLD_MS = 1000;

const PAGES =
  '[data-split-view-column="content"] > [data-split-view-pages] > [data-split-view-page]';
const CURRENT_SCROLLER = `${PAGES}[data-split-view-page="current"] > :first-child`;

/**
 * The scroll of each content page of a `NavigationSplitView` where the page
 * scrolls the content, as on a phone, as a column keeps the scroll of each
 * page elsewhere. The page in the flow shows at the scroll of the page.
 * Each page beside it, under it or leaving, is moved to show its own
 * scroll, so that it shows as it was while a motion moves it.
 *
 * - `onPageScrolls` gets whether the page scrolls the content, each time
 *   that changes. Only a change of the width of the view can change it.
 * - `remember` keeps the scroll of the page that shows, when a navigation
 *   starts. Until the next `follow`, or for a short time, a scroll does not
 *   count, as the browser can restore the scroll of the entry it goes to.
 * - `follow` scrolls the page after the page that shows changes: a page
 *   that a push or a swap shows starts at the top, and a page that a pop
 *   shows again goes back to its scroll.
 * - `align` moves each page beside the one that shows to its own scroll.
 *   `follow` does it, and a swipe back does it before it shows the page
 *   under.
 *
 * @internal
 */
export function createPageScroll(
  view: HTMLElement,
  key: string,
  onPageScrolls: (pageScrolls: boolean) => void,
) {
  const scrolls = new Map<string, number>();
  let shown = key;
  let heldUntil = 0;
  let pageScrolls = false;
  let width: number | null = null;

  const pages = () => view.querySelectorAll<HTMLElement>(PAGES);

  function align() {
    for (const page of pages()) {
      if (!pageScrolls || page.dataset.splitViewPage === "current") {
        page.style.removeProperty("top");
      } else {
        const top = scrolls.get(page.dataset.splitViewPageKey ?? "") ?? 0;
        page.style.top = `${String(window.scrollY - top)}px`;
      }
    }
  }

  function measure() {
    const scroller = view.querySelector(CURRENT_SCROLLER);
    const next = scroller !== null && !scrollsBlock(scroller);
    if (next === pageScrolls) return;
    pageScrolls = next;
    align();
    onPageScrolls(pageScrolls);
  }

  const onScroll = () => {
    if (pageScrolls && performance.now() >= heldUntil) {
      scrolls.set(shown, window.scrollY);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  measure();
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(([entry]) => {
          const next = entry.borderBoxSize[0].inlineSize;
          if (next === width) return;
          width = next;
          measure();
        });
  resizeObserver?.observe(view);

  return {
    remember() {
      if (!pageScrolls) return;
      scrolls.set(shown, window.scrollY);
      heldUntil = performance.now() + HOLD_MS;
    },
    follow(next: string, change: "push" | "pop" | "swap" | null) {
      shown = next;
      heldUntil = 0;
      if (change !== null && pageScrolls) {
        const top = change === "pop" ? (scrolls.get(next) ?? 0) : 0;
        scrolls.set(next, top);
        window.scrollTo({ top, behavior: "instant" });
      }
      align();
    },
    align,
    destroy() {
      window.removeEventListener("scroll", onScroll);
      resizeObserver?.disconnect();
      for (const page of pages()) page.style.removeProperty("top");
    },
  };
}

/** @internal */
export type PageScroll = ReturnType<typeof createPageScroll>;
