import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { scrollsBlock } from "../../effect-layer/check-declared-carrier.ts";
import { findTwinElement } from "../../focus/find-twin-element.ts";
import { isRendered } from "../../focus/is-rendered.ts";
import { isTyping } from "../../focus/is-typing.ts";
import { getScrollBehavior } from "../../get-scroll-behavior.ts";
import { currentContentScroller } from "../create-page-scroll.ts";
import type { SplitViewBackLink, SplitViewColumnState } from "./types.ts";

/** How far an arrow key scrolls the content, in px. */
const ARROW_KEY_STEP = 40;
/** The share of the content's height that a page key scrolls. */
const PAGE_KEY_SHARE = 0.9;

function isShown(element: Element) {
  return isRendered(element, { visibilityProperty: true });
}

/** True where an arrow key moves inside a control, such as a radio group. */
function ownsArrowKeys(target: Element | null) {
  return (
    target?.closest(
      "[role=radiogroup], [role=tablist], [role=slider], [role=menu], [role=menubar], [role=listbox], [role=grid], [role=tree], [role=toolbar]",
    ) != null
  );
}

/**
 * Moves focus to the next or the previous column link in the column that
 * has focus, or else in the deepest column that has links. False where
 * there is no link to move to.
 */
function moveFocus(view: HTMLElement, target: Element | null, step: 1 | -1) {
  const ownColumns = [
    ...view.querySelectorAll<HTMLElement>(
      ":scope > * > [data-split-view-column]",
    ),
  ];
  const focused = ownColumns.find((column) => column.contains(target));
  const columns = focused ? [focused] : ownColumns.reverse();
  for (const column of columns) {
    if (!isShown(column)) continue;
    const links = [
      ...column.querySelectorAll<HTMLElement>("[data-split-view-link]"),
    ].filter(
      (link) => link.closest("[data-split-view]") === view && isShown(link),
    );
    if (links.length === 0) continue;
    const current = links.findIndex(
      (link) => target !== null && link.contains(target),
    );
    const next =
      current === -1
        ? step === 1
          ? 0
          : links.length - 1
        : Math.min(links.length - 1, Math.max(0, current + step));
    links[next].focus();
    return true;
  }
  return false;
}

/**
 * Scrolls the content for a key that scrolls, where nothing has focus. A browser
 * scrolls the page for such a key, and the page does not scroll here. False where
 * the key does not scroll the column, so the browser takes it.
 */
function scrollContentByKey(view: HTMLElement, event: KeyboardEvent) {
  const scroller = currentContentScroller(view);
  if (scroller === null || !scrollsBlock(scroller)) return false;
  const page = scroller.clientHeight * PAGE_KEY_SHARE;
  const backward = event.shiftKey ? -1 : 1;
  const top = {
    ArrowDown: ARROW_KEY_STEP,
    ArrowUp: -ARROW_KEY_STEP,
    PageDown: page,
    PageUp: -page,
    " ": page * backward,
    End: scroller.scrollHeight,
    Home: -scroller.scrollHeight,
  }[event.key];
  if (top === undefined) return false;
  scroller.scrollBy({
    top,
    behavior: event.key.startsWith("Arrow") ? "instant" : getScrollBehavior(),
  });
  return true;
}

/**
 * The keys of the view. See `NavigationSplitView`.
 *
 * @internal
 */
export function useColumnKeys(
  view: HTMLElement | null,
  deepestBack: SplitViewBackLink | null,
  takeOff: (href: string) => void,
  isContained: boolean,
) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (view === null || event.defaultPrevented || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const hasNoFocus = target === null || target === document.body;
    if (hasNoFocus ? isContained : !view.contains(target)) return;
    if (hasNoFocus && scrollContentByKey(view, event)) {
      event.preventDefault();
      return;
    }
    if (isTyping(target)) return;
    if (document.querySelector("[aria-modal=true]") !== null) return;
    switch (event.key) {
      case "Escape":
      case "ArrowLeft": {
        if (deepestBack === null) return;
        if (event.key === "ArrowLeft" && ownsArrowKeys(target)) return;
        event.preventDefault();
        takeOff(deepestBack.href);
        return;
      }
      case "ArrowRight": {
        if (
          target instanceof HTMLElement &&
          target.matches("[data-split-view-link]")
        ) {
          event.preventDefault();
          target.click();
        }
        return;
      }
      case "j":
      case "J":
      case "k":
      case "K": {
        const step = event.key.toLowerCase() === "j" ? 1 : -1;
        if (moveFocus(view, target, step)) event.preventDefault();
        return;
      }
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handle(event);
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, []);
}

/**
 * Keeps focus in the view when the deepest column changes. A column that
 * covers the focused element takes focus, and when the detail goes, focus
 * goes back to the element that opened it.
 *
 * @internal
 */
export function useStackFocus(
  view: HTMLElement | null,
  column: SplitViewColumnState["column"],
  key: string | null,
) {
  const shownRef = useRef({ column, key });
  const triggerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const previous = shownRef.current;
    if (view === null || (previous.column === column && previous.key === key))
      return;
    shownRef.current = { column, key };
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const isPush =
      (column === "detail" && previous.column !== "detail") ||
      (column === "content" && previous.column === "sidebar");
    if (isPush && active !== null && view.contains(active)) {
      triggerRef.current = active;
    }
    if (active !== null && active !== document.body && isShown(active)) {
      return;
    }
    const trigger =
      triggerRef.current === null
        ? null
        : findTwinElement(triggerRef.current, view);
    if (!isPush && trigger !== null && isShown(trigger)) {
      trigger.focus({ preventScroll: true });
      return;
    }
    view
      .querySelector<HTMLElement>(
        `:scope > * > [data-split-view-column="${column}"]`,
      )
      ?.focus({ preventScroll: true });
  }, [view, column, key]);
}
