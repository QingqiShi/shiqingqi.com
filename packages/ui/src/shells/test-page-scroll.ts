import { afterEach, beforeEach, vi } from "vitest";
import { createPageScroll } from "./create-page-scroll.ts";

/** @internal */
export const SCREEN_HEIGHT = 800;
/** @internal */
export const TALL = 10_000;

/** What a browser does to a box that scrolls: it clamps at once, and tells later. */
class ScrollBox {
  top = 0;
  height = TALL;
  #hasScrollEvent = false;
  fireScroll: () => void;
  onMove: (top: number) => void;

  constructor(
    fireScroll: () => void,
    onMove: (top: number) => void = () => {},
  ) {
    this.fireScroll = fireScroll;
    this.onMove = onMove;
  }

  scrollTo(top: number) {
    const next = Math.max(0, Math.min(top, this.height - SCREEN_HEIGHT));
    if (next === this.top) return;
    this.top = next;
    this.#hasScrollEvent = true;
    this.onMove(next);
  }

  setHeight(height: number) {
    this.height = height;
    this.scrollTo(this.top);
  }

  /** Puts the box somewhere without a scroll event, as a new document starts. */
  place(top: number) {
    this.top = top;
    this.#hasScrollEvent = false;
    this.onMove(top);
  }

  runScrollSteps() {
    if (!this.#hasScrollEvent) return false;
    this.#hasScrollEvent = false;
    this.fireScroll();
    return true;
  }
}

const boxOfObserved = new WeakMap<Element, ScrollBox>();

class FakeResizeObserver implements ResizeObserver {
  static all = new Set<FakeResizeObserver>();
  #observed = new Map<Element, number | null>();
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.all.add(this);
  }

  observe(element: Element) {
    this.#observed.set(element, null);
  }

  unobserve(element: Element) {
    this.#observed.delete(element);
  }

  disconnect() {
    this.#observed.clear();
    FakeResizeObserver.all.delete(this);
  }

  deliver() {
    const entries: ResizeObserverEntry[] = [];
    for (const [target, delivered] of this.#observed) {
      const height = boxOfObserved.get(target)?.height ?? 0;
      if (height === delivered) continue;
      this.#observed.set(target, height);
      entries.push({
        target,
        borderBoxSize: [{ inlineSize: 390, blockSize: height }],
        contentBoxSize: [],
        contentRect: new DOMRect(),
        devicePixelContentBoxSize: [],
      });
    }
    if (entries.length > 0) this.callback(entries, this);
    return entries.length > 0;
  }
}

/** @internal */
export const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
  documentBox.scrollTo(top ?? 0);
});

/** @internal */
export let documentBox: ScrollBox;
let columnBoxes: ScrollBox[] = [];

/** One frame of the browser: scroll events come first, and the observers come after layout. */
function frame() {
  const scrolled = [documentBox, ...columnBoxes].map((box) =>
    box.runScrollSteps(),
  );
  const resized = [...FakeResizeObserver.all].map((observer) =>
    observer.deliver(),
  );
  return [...scrolled, ...resized].some(Boolean);
}

/** @internal */
export function frames() {
  for (let count = 0; count < 20 && frame(); count += 1);
}

/** The history of the tab, which the browser keeps for each entry. */
let entries: { state: unknown; url: string }[] = [];
let entryIndex = 0;

function resetHistory(url: string) {
  window.history.replaceState(null, "", url);
  entries = [{ state: null, url }];
  entryIndex = 0;
}

/** @internal */
export function visit(url: string) {
  entries[entryIndex].state = window.history.state;
  entries.length = entryIndex + 1;
  entries.push({ state: null, url });
  entryIndex += 1;
  window.history.pushState(null, "", url);
}

/** @internal */
export function traverse(delta: number) {
  entries[entryIndex].state = window.history.state;
  entryIndex += delta;
  const { state, url } = entries[entryIndex];
  window.history.replaceState(state, "", url);
}

/**
 * A view with one content page, whose scroller leaves the scroll to the page, as on a phone.
 *
 * @internal
 */
export function phoneView(aside = "") {
  const view = document.createElement("div");
  view.innerHTML = `<div><section data-split-view-column="content"><div data-split-view-pages>
    <div data-split-view-page="current"><div></div></div>${aside}
  </div></section></div>`;
  document.body.append(view);
  boxOfObserved.set(view, documentBox);
  return view;
}

/**
 * A view whose content page scrolls in its own column, as on a wide screen.
 *
 * @internal
 */
export function columnView() {
  const view = phoneView();
  const scroller = view.querySelector<HTMLElement>(
    '[data-split-view-page="current"] > :first-child',
  );
  if (scroller === null) throw new Error("The view has no scroller.");
  scroller.style.overflowY = "auto";
  const content = document.createElement("div");
  scroller.append(content);

  const box = new ScrollBox(() => {
    scroller.dispatchEvent(new Event("scroll"));
  });
  columnBoxes.push(box);
  boxOfObserved.set(content, box);
  Object.defineProperties(scroller, {
    scrollTop: { get: () => box.top },
    scrollHeight: { get: () => box.height },
    clientHeight: { get: () => SCREEN_HEIGHT },
  });
  scroller.scrollTo = (options) => {
    if (typeof options === "object") box.scrollTo(options.top ?? 0);
  };
  return { view, box };
}

let mounted: ReturnType<typeof createPageScroll>[] = [];

/** @internal */
export function mountShell(view: HTMLElement, isOpening = false) {
  const shell = createPageScroll(view, "page", () => {}, true, isOpening);
  mounted.push(shell);
  return shell;
}

/** @internal */
export function mountSkeleton(view: HTMLElement) {
  return mountShell(view, true);
}

/** @internal */
export function hidePage() {
  window.dispatchEvent(new Event("pagehide"));
}

/**
 * Mounts a view at the entry, as a reload does, and gives where it goes.
 *
 * @internal
 */
export function scrollAfterReload(entry: unknown) {
  window.history.replaceState(entry, "", "/report");
  documentBox.place(0);
  scrollTo.mockClear();
  const reloaded = mountShell(phoneView());
  const top = scrollTo.mock.lastCall?.[0].top;
  reloaded.destroy();
  return top;
}

/**
 * A scroll that the visitor makes with no input the view hears, as with a scroll bar.
 *
 * @internal
 */
export function scrollPage(top: number) {
  documentBox.scrollTo(top);
  frame();
}

/** @internal */
export function tap() {
  window.dispatchEvent(new Event("touchstart"));
}

/** @internal */
export function startDrag() {
  tap();
  window.dispatchEvent(new Event("touchmove"));
}

/** @internal */
export function dragPage(top: number) {
  startDrag();
  scrollPage(top);
}

/** @internal */
export function installPageScrollHarness() {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["performance"] });
    vi.advanceTimersByTime(10_000);
    documentBox = new ScrollBox(
      () => window.dispatchEvent(new Event("scroll")),
      (top) => {
        vi.stubGlobal("scrollY", top);
      },
    );
    columnBoxes = [];
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("scrollY", 0);
    vi.stubGlobal("innerHeight", SCREEN_HEIGHT);
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => documentBox.height,
    });
    resetHistory("/report");
    sessionStorage.clear();
  });

  afterEach(() => {
    for (const shell of mounted) shell.destroy();
    mounted = [];
    vi.useRealTimers();
    vi.unstubAllGlobals();
    scrollTo.mockClear();
    FakeResizeObserver.all.clear();
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
    document.body.replaceChildren();
  });
}
