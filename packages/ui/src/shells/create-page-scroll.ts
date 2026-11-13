import { scrollsBlock } from "../effect-layer/check-declared-carrier.ts";

/** How long, in ms, a scroll after a navigation starts does not count as the scroll of the page that shows. */
const HOLD_MS = 1000;

const PAGES =
  ':scope > * > [data-split-view-column="content"] > [data-split-view-pages] > [data-split-view-page]';
const CURRENT_PAGE = `${PAGES}[data-split-view-page="current"]`;
const CURRENT_SCROLLER = `${CURRENT_PAGE} > :first-child`;
const STACK_ROOT =
  ':scope > * > [data-split-view-column="sidebar"] > [data-split-view-pages] > [data-split-view-stack]';
const STACK_ROOT_SHOWN = `${STACK_ROOT}[data-split-view-stack="root"]`;

/**
 * What says that the visitor scrolls, and that the view no longer takes the page
 * back to its scroll. This excludes `touchstart`, because a tap also starts with it.
 */
const USER_SCROLL_INPUTS = ["wheel", "touchmove", "keydown"] as const;

const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

/** Where the scroll of a page waits for the view that comes back to its history entry. */
const ENTRY_SCROLL_PREFIX = "split-view-scroll:";
/** The name in `history.state` of the key of an entry, where the browser gives none. */
const ENTRY_STATE_NAME = "splitViewEntry";

/**
 * The scroller of the content page that shows.
 *
 * @internal
 */
export function currentContentScroller(view: HTMLElement) {
  return view.querySelector<HTMLElement>(CURRENT_SCROLLER);
}

function stampedEntry() {
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null) return null;
  if (!(ENTRY_STATE_NAME in state)) return null;
  const stamp = state[ENTRY_STATE_NAME];
  return typeof stamp === "string" ? stamp : null;
}

/**
 * The key of the current history entry, `null` where it has none yet. A replace
 * keeps the key of the browser and can go to another URL, so the URL is part of
 * the key. A browser without the Navigation API has only `history.state`, and a
 * router can write over that. The key then starts again at the next scroll.
 */
function historyEntryKey() {
  const entry =
    ("navigation" in window ? window.navigation.currentEntry?.key : null) ??
    stampedEntry();
  return entry === null
    ? null
    : `${entry}:${window.location.pathname}${window.location.search}`;
}

function ownHistoryEntryKey() {
  const key = historyEntryKey();
  if (key !== null) return key;
  const state: unknown = window.history.state;
  window.history.replaceState(
    {
      ...(typeof state === "object" ? state : null),
      [ENTRY_STATE_NAME]: `${String(Date.now())}-${String(Math.random())}`,
    },
    "",
  );
  return historyEntryKey() ?? "";
}

function readEntryScroll(entry: string | null) {
  if (entry === null) return null;
  try {
    const top = sessionStorage.getItem(ENTRY_SCROLL_PREFIX + entry);
    return top === null ? null : Number(top);
  } catch {
    return null;
  }
}

function writeEntryScroll(entry: string, top: number) {
  try {
    sessionStorage.setItem(ENTRY_SCROLL_PREFIX + entry, String(top));
  } catch {
    // Without storage, a reload starts at the top, which is what it always does.
  }
}

/**
 * The key of the scroll of the sidebar, where it is the root page of the stack.
 *
 * @internal
 */
export const STACK_ROOT_KEY = "split-view-stack-root";

/**
 * Whether the page scrolls the sidebar, as the root page of the stack. Beside
 * the content, the sidebar sticks to the screen, and it is no page.
 */
function isStackPage(root: HTMLElement) {
  const column = root.closest("[data-split-view-column]");
  return column === null || getComputedStyle(column).position !== "sticky";
}

/** How many views keep the scroll of their pages on their own now. */
let scrollOwners = 0;

/**
 * The scroll of each content page of a `NavigationSplitView` where the page
 * scrolls the content, as a column keeps the scroll of each page in a view
 * that does not fill the screen. Beside the content, the sidebar is no page,
 * and the scroll of the page is that of the content page that shows. The page in the flow shows at the scroll of the page.
 * Each page beside it, under it or leaving, is moved to show its own
 * scroll, so that it shows as it was while a motion moves it.
 *
 * - `onPageScrolls` gets whether the page scrolls the content, each time
 *   that changes. Only a change of the width of the view can change it.
 * - `remember` keeps the scroll of the page that shows, when a navigation
 *   starts. Until the next `follow`, or for a short time, a scroll does not
 *   count, as the browser can restore the scroll of the entry it goes to.
 *   Back and Forward change the entry before the router changes the page, and
 *   the old page can stay for a long time. Until `follow`, a scroll waits, as
 *   only a step that stays at the same page makes it the scroll of the entry.
 *   That step gets no `follow`, so the scroll counts when the visitor leaves.
 *   A `destroy` drops it, as the router has shown another page.
 * - `follow` scrolls the page after the page that shows changes: a page
 *   that a push or a swap shows starts at the top, and a page that a pop
 *   shows again goes back to its scroll.
 * - `align` moves each page beside the one that shows to its own scroll.
 *   `follow` does it, and a swipe back does it before it shows the page
 *   under.
 * - `hold` does not count a scroll for a short time, for a tab switch that hides
 *   the screen, which clamps the scroll.
 * - `setNavigating` tells whether a navigation of the view is pending. When it
 *   ends, the view is at the entry again, and a navigation that stays at the
 *   entry takes the page back to the scroll it left.
 *
 * With `ownsScroll`, the view opens a page before the router changes the URL,
 * so the browser would keep the scroll of the new page for the entry of the
 * old one, and restore that on Back. Thus while the page scrolls the content,
 * the browser restores no scroll, and Back and Forward go back to the scroll
 * that the page they show had. The browser keeps this setting for each history
 * entry, and a new entry takes it from the entry before. So it goes back on
 * when the last such view goes, and for a reload. Where the column scrolls, the
 * router's new page has a new scroller, so Back and Forward do the same there.
 * The scroll of the entry waits in the session storage, for a reload and for
 * Back to a view that went. From the start of a navigation until the URL
 * changes, a scroll does not count for the entry, as what shows is no longer
 * its page. A click that starts no navigation gives the entry back after a short
 * time. A view that mounts goes to the scroll of its entry. Each scroll that
 * goes back to a place, on a mount, on Back or on Forward, is a restoration: a
 * page that is still too short gets there as it grows, and the clamp is not its
 * scroll. An input stops the page going further, and a scroll that the view did
 * not make ends the restoration and counts. With `isOpening`, the view is the
 * skeleton of a destination that opens, at the URL of the screen that leaves: it
 * does not go to the scroll of the entry and does not keep it. A shorter new page clamps the scroll that a view mounts at, and a
 * loading fallback would keep that for the page that replaces it, so such a
 * scroll does not count for a short time, until the visitor scrolls.
 *
 * @internal
 */
export function createPageScroll(
  view: HTMLElement,
  key: string,
  onPageScrolls: (pageScrolls: boolean) => void,
  ownsScroll: boolean,
  isOpening = false,
) {
  const scrolls = new Map<string, number>();
  /** Where a page that left before its restoration ended still has to go. */
  const unreached = new Map<string, number>();
  /** The page that the view names. Beside the content, the sidebar stands for the content page that shows. */
  let named = key;
  let shown = pageKey(named);
  let heldUntil = 0;
  let arrivingUntil = window.scrollY > 0 ? performance.now() + HOLD_MS : 0;
  let pageScrolls = false;
  let width: number | null = null;

  let isOwner = false;
  let isHistoryStep = false;
  let entryScroll: { entry: string; top: number } | null = null;
  let stepScroll: { entry: string; top: number } | null = null;
  let restoration: {
    target: number;
    landedAt: number;
    height: number;
    isStopped: boolean;
  } | null = null;
  let growingContent: Element | null = null;
  let isNavigating = isOpening;
  let leavingEntry = isOpening && ownsScroll ? ownHistoryEntryKey() : null;
  let leavingUntil = 0;

  function pageKey(key: string) {
    if (key !== STACK_ROOT_KEY) return key;
    const root = view.querySelector<HTMLElement>(STACK_ROOT);
    if (root === null || isStackPage(root)) return key;
    return (
      view.querySelector<HTMLElement>(CURRENT_PAGE)?.dataset.splitViewPageKey ??
      key
    );
  }

  function isLeaving(entry: string | null) {
    return (
      entry !== null &&
      entry === leavingEntry &&
      (isNavigating || performance.now() < leavingUntil)
    );
  }

  function saveEntryScroll() {
    if (entryScroll !== null) {
      writeEntryScroll(entryScroll.entry, entryScroll.top);
    }
  }

  function keepEntryScroll(top: number, entry = ownHistoryEntryKey()) {
    if (isLeaving(entry)) return;
    if (entryScroll?.entry !== entry) saveEntryScroll();
    entryScroll = { entry, top };
  }

  function keepShownScroll(top: number) {
    if (isHistoryStep) stepScroll = { entry: ownHistoryEntryKey(), top };
    else keepEntryScroll(top);
  }

  function countStepScroll() {
    if (stepScroll !== null) keepEntryScroll(stepScroll.top, stepScroll.entry);
    stepScroll = null;
  }

  function shownScroll() {
    return pageScrolls
      ? window.scrollY
      : (currentContentScroller(view)?.scrollTop ?? 0);
  }

  function shownHeight() {
    return (
      (pageScrolls ? document.documentElement : currentContentScroller(view))
        ?.scrollHeight ?? 0
    );
  }

  function shownScrollEnd() {
    // A phone browser can hide its toolbar. Then the page scrolls less far than
    // clientHeight tells, and innerHeight gives the correct end.
    const screen = pageScrolls
      ? window.innerHeight
      : (currentContentScroller(view)?.clientHeight ?? 0);
    return shownHeight() - screen;
  }

  function leaveEntry() {
    const target = restoration?.target;
    restoration = null;
    if (!ownsScroll) return;
    const entry = ownHistoryEntryKey();
    if (isLeaving(entry)) return;
    keepEntryScroll(target ?? shownScroll());
    leavingEntry = entry;
    leavingUntil = performance.now() + HOLD_MS;
  }

  function currentEntryScroll() {
    const entry = historyEntryKey();
    return entryScroll !== null && entryScroll.entry === entry
      ? entryScroll.top
      : readEntryScroll(entry);
  }

  function own(next: boolean) {
    if (next === isOwner) return;
    isOwner = next;
    scrollOwners += next ? 1 : -1;
    history.scrollRestoration = scrollOwners > 0 ? "manual" : "auto";
  }

  const onPageHide = () => {
    own(false);
    countStepScroll();
    if (ownsScroll && restoration !== null) keepEntryScroll(restoration.target);
    saveEntryScroll();
  };
  const onPageShow = ({ persisted }: PageTransitionEvent) => {
    own(ownsScroll && pageScrolls);
    if (persisted) {
      isHistoryStep = false;
      leavingEntry = null;
      heldUntil = 0;
      arrivingUntil = 0;
    }
  };

  const pages = () =>
    view.querySelectorAll<HTMLElement>(`${PAGES}, ${STACK_ROOT}`);

  function isAside(page: HTMLElement, isStackRootShown: boolean) {
    const { dataset } = page;
    return dataset.splitViewStack === undefined
      ? dataset.splitViewPage !== "current" || isStackRootShown
      : dataset.splitViewStack === "under" && isStackPage(page);
  }

  function align() {
    const scrollY = pageScrolls ? window.scrollY : 0;
    const shownRoot = pageScrolls
      ? view.querySelector<HTMLElement>(STACK_ROOT_SHOWN)
      : null;
    const isStackRootShown = shownRoot !== null && isStackPage(shownRoot);
    for (const page of pages()) {
      if (!pageScrolls || !isAside(page, isStackRootShown)) {
        page.style.removeProperty("top");
      } else {
        const top = scrolls.get(page.dataset.splitViewPageKey ?? "") ?? 0;
        page.style.top = `${String(scrollY - top)}px`;
      }
    }
  }

  function measure() {
    const scroller = currentContentScroller(view);
    const next = scroller !== null && !scrollsBlock(scroller);
    if (next === pageScrolls) return;
    pageScrolls = next;
    restoration = null;
    watchGrowingContent();
    own(ownsScroll && pageScrolls);
    align();
    onPageScrolls(pageScrolls);
  }

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) => {
          const viewEntry = entries.find(({ target }) => target === view);
          const next = viewEntry?.borderBoxSize[0].inlineSize ?? width;
          if (next !== width) {
            width = next;
            measure();
            shown = pageKey(named);
            align();
          }
          if (restoration === null || restoration.isStopped) return;
          restoreTo(restoration.target);
          align();
        });

  /** A column keeps its height as its content grows, so the content tells it. */
  function watchGrowingContent() {
    const next =
      pageScrolls || restoration === null
        ? null
        : (currentContentScroller(view)?.firstElementChild ?? null);
    if (next === growingContent) return;
    if (growingContent !== null) resizeObserver?.unobserve(growingContent);
    if (next !== null) resizeObserver?.observe(next);
    growingContent = next;
  }

  function restoreTo(target: number) {
    (pageScrolls ? window : currentContentScroller(view))?.scrollTo({
      top: target,
      behavior: "instant",
    });
    const landedAt = shownScroll();
    restoration =
      landedAt + 1 < target
        ? { target, landedAt, height: shownHeight(), isStopped: false }
        : null;
    watchGrowingContent();
  }

  /**
   * Whether a scroll event comes from a clamp during a restoration. The browser
   * sends the event in a later frame, so an input can come before it. A page that
   * changes its height clamps too, and the event comes before the resize. WebKit
   * can make the page shorter and then taller before the event, so with no input,
   * any change of height counts, not only a smaller height. After an input, the
   * visitor can scroll before the resize, so the height tells nothing. Then only
   * a move up to the end of the scroll range is a clamp.
   */
  function isClampOfRestoration() {
    if (restoration === null) return false;
    const top = shownScroll();
    if (Math.abs(top - restoration.landedAt) <= 1) return true;
    const height = shownHeight();
    const isClamp = restoration.isStopped
      ? top < restoration.landedAt && top + 1 >= shownScrollEnd()
      : height !== restoration.height;
    if (!isClamp) {
      restoration = null;
      watchGrowingContent();
      return false;
    }
    restoration.landedAt = top;
    restoration.height = height;
    return true;
  }

  const onUserScrollInput = (event: Event) => {
    if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
    if (restoration !== null) restoration.isStopped = true;
    arrivingUntil = 0;
  };

  const onScroll = () => {
    if (!pageScrolls || isClampOfRestoration()) return;
    if (performance.now() < Math.max(heldUntil, arrivingUntil)) return;
    scrolls.set(shown, window.scrollY);
    if (ownsScroll) keepShownScroll(window.scrollY);
  };
  function isCurrentContentScroller(element: HTMLElement) {
    const page = element.parentElement;
    if (page?.dataset.splitViewPage !== "current") return false;
    const column = page.parentElement?.parentElement;
    return (
      column?.dataset.splitViewColumn === "content" &&
      column.parentElement?.parentElement === view &&
      page.firstElementChild === element
    );
  }
  const onColumnScroll = ({ target }: Event) => {
    if (
      !pageScrolls &&
      target instanceof HTMLElement &&
      isCurrentContentScroller(target) &&
      !isClampOfRestoration()
    ) {
      scrolls.set(shown, target.scrollTop);
      keepShownScroll(target.scrollTop);
    }
  };
  const restoreEntryScroll = () => {
    if (!ownsScroll || isLeaving(historyEntryKey())) return;
    const top = currentEntryScroll();
    if (top === null) return;
    scrolls.set(shown, top);
    restoreTo(top);
    align();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  if (ownsScroll) {
    view.addEventListener("scroll", onColumnScroll, {
      capture: true,
      passive: true,
    });
  }
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  for (const input of USER_SCROLL_INPUTS) {
    window.addEventListener(input, onUserScrollInput, { passive: true });
  }
  measure();
  restoreEntryScroll();
  resizeObserver?.observe(view);

  return {
    remember(step = false) {
      const target = restoration?.target;
      countStepScroll();
      isHistoryStep = step;
      // A step of the browser has changed the entry already, without the
      // Navigation API, and each scroll of its page has counted.
      if (step) leavingEntry = null;
      else leaveEntry();
      if (!pageScrolls) return;
      scrolls.set(shown, window.scrollY);
      if (target === undefined) unreached.delete(shown);
      else unreached.set(shown, target);
      heldUntil = performance.now() + HOLD_MS;
    },
    hold() {
      countStepScroll();
      leaveEntry();
      heldUntil = performance.now() + HOLD_MS;
    },
    setNavigating(next: boolean) {
      if (next === isNavigating) return;
      const stays = !next && isLeaving(historyEntryKey());
      isNavigating = next;
      if (next) return;
      leavingEntry = null;
      heldUntil = 0;
      if (stays) restoreEntryScroll();
    },
    follow(next: string, change: "push" | "pop" | "swap" | null) {
      named = next;
      const page = pageKey(next);
      const isOtherPage = page !== shown;
      const isStep = ownsScroll && isHistoryStep;
      isHistoryStep = false;
      if (isOtherPage) stepScroll = null;
      else countStepScroll();
      shown = page;
      heldUntil = 0;
      if (isOtherPage || isStep) restoration = null;
      if (change !== null && isOtherPage) {
        const top =
          (isStep ? currentEntryScroll() : null) ??
          (isStep || change === "pop"
            ? (unreached.get(page) ?? scrolls.get(page) ?? 0)
            : 0);
        unreached.delete(page);
        scrolls.set(page, top);
        if (pageScrolls || ownsScroll) restoreTo(top);
      }
      watchGrowingContent();
      align();
    },
    align,
    destroy() {
      window.removeEventListener("scroll", onScroll);
      view.removeEventListener("scroll", onColumnScroll, { capture: true });
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      for (const input of USER_SCROLL_INPUTS) {
        window.removeEventListener(input, onUserScrollInput);
      }
      resizeObserver?.disconnect();
      own(false);
      saveEntryScroll();
      for (const page of pages()) page.style.removeProperty("top");
    },
  };
}

/** @internal */
export type PageScroll = ReturnType<typeof createPageScroll>;
