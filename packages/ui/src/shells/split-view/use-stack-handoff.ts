import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { currentContentScroller } from "../create-page-scroll.ts";
import type { LeavingCopy } from "../leaving-copy-taker.tsx";
import { normalizeUrl } from "../normalize-url.ts";
import type { NavigationSplitViewColumn } from "./types.ts";

/**
 * The key of the page that a screen takes from the screen before it.
 *
 * @internal
 */
export const HANDOFF_PAGE_KEY = "split-view-handoff";

/** How long, in ms, a screen that left waits for the screen that takes it. */
const HANDOFF_MS = 500;
/** How long, in ms, after a swipe back the screen that comes plays no pop. */
const SWIPE_MS = 2000;

interface StackHandoff {
  /** The URL of the screen that left. */
  href: string;
  backHref: string | null;
  label: string;
  isFlush: boolean;
  /** The box of its content, which React took out of the document. */
  content: Element;
  top: number;
  pageTop: number;
  at: number;
}

// The screen that left last, until the next screen takes it. The React
// Compiler reads a module variable again at each use, so an object holds it.
const left: { screen: StackHandoff | null } = { screen: null };

/**
 * How the stack changed between the screen that left and the screen that
 * came: a push where the way back of the new screen leads to the old one, a
 * pop where the way back of the old screen leads to the new one, and else no
 * change of depth.
 *
 * @internal
 */
export function stackChange({
  leftHref,
  leftBackHref,
  href,
  backHref,
}: {
  leftHref: string;
  leftBackHref: string | null;
  href: string;
  backHref: string | null;
}) {
  if (backHref === leftHref) return "push";
  if (leftBackHref === href) return "pop";
  return null;
}

/** The children of `content`, moved out of it, with nothing that an id or a name can reach. */
function nodesOf(content: Element) {
  const nodes = document.createDocumentFragment();
  // The effect layer keeps its `<canvas>` elements at the end of the box, and
  // takes them out itself.
  nodes.append(
    ...[...content.childNodes].filter(
      (node) =>
        !(node instanceof Element && node.hasAttribute("data-effect-canvases")),
    ),
  );
  for (const element of nodes.querySelectorAll(
    "[id], [name], [for], [data-split-view-link]",
  )) {
    element.removeAttribute("id");
    element.removeAttribute("name");
    element.removeAttribute("for");
    element.removeAttribute("data-split-view-link");
  }
  return nodes;
}

/**
 * Each screen of a stack is a view of its own, in its own page of the router,
 * so no view sees the screen before it. A view with no list and no detail
 * thus leaves the DOM of its content, which React has let go of, to the view
 * that mounts in the same commit. That view shows it as the page that leaves
 * and plays the push or the pop, where its `back` leads to the screen that
 * left, or the `back` of that screen leads to it. A screen that a swipe back
 * took off has moved out already, so the next screen plays nothing.
 *
 * @internal
 */
export function useStackHandoff({
  view,
  isStackScreen,
  content,
  copyRef,
  swipedAtRef,
  enter,
}: {
  view: HTMLElement | null;
  isStackScreen: boolean;
  content: NavigationSplitViewColumn;
  copyRef: RefObject<LeavingCopy | null>;
  swipedAtRef: RefObject<number>;
  enter: (change: "push" | "pop", label: string) => void;
}) {
  const hrefRef = useRef<string | null>(null);
  useEffect(() => {
    hrefRef.current = normalizeUrl(window.location.href);
  });
  const arrive = useEffectEvent(() => {
    const taken = left.screen;
    left.screen = null;
    hrefRef.current = normalizeUrl(window.location.href);
    if (taken === null || !isStackScreen) return;
    if (performance.now() - taken.at > HANDOFF_MS) return;
    if (taken.isFlush !== (content.flush === true)) return;
    const change = stackChange({
      leftHref: taken.href,
      leftBackHref: taken.backHref,
      href: hrefRef.current,
      backHref: content.back == null ? null : normalizeUrl(content.back.href),
    });
    if (change === null) return;
    copyRef.current = {
      key: HANDOFF_PAGE_KEY,
      nodes: nodesOf(taken.content),
      top: taken.top,
      pageTop: taken.pageTop,
    };
    enter(change, taken.label);
  });
  const leave = useEffectEvent((leftView: HTMLElement) => {
    left.screen = null;
    if (!isStackScreen) return;
    if (performance.now() - swipedAtRef.current < SWIPE_MS) return;
    const scroller = currentContentScroller(leftView);
    const box = scroller?.firstElementChild;
    if (scroller == null || box == null) return;
    const pageScrolls = scroller.scrollHeight <= scroller.clientHeight;
    const screen: StackHandoff = {
      href: hrefRef.current ?? normalizeUrl(window.location.href),
      backHref: content.back == null ? null : normalizeUrl(content.back.href),
      label: content.label,
      isFlush: content.flush === true,
      content: box,
      top: scroller.scrollTop,
      pageTop: pageScrolls ? window.scrollY : 0,
      at: performance.now(),
    };
    left.screen = screen;
    // No screen takes it after a navigation out of the stack, so let go of
    // its DOM.
    setTimeout(() => {
      if (left.screen === screen) left.screen = null;
    }, HANDOFF_MS);
  });
  useLayoutEffect(() => {
    if (view === null) return;
    arrive();
    return () => {
      leave(view);
    };
  }, [view]);
}
