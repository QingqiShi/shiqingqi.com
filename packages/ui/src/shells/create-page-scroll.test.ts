import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPageScroll } from "./create-page-scroll.ts";

const SCREEN_HEIGHT = 800;
const TALL = 10_000;

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

const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
  documentBox.scrollTo(top ?? 0);
});

let documentBox: ScrollBox;
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

function frames() {
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

function visit(url: string) {
  entries[entryIndex].state = window.history.state;
  entries.length = entryIndex + 1;
  entries.push({ state: null, url });
  entryIndex += 1;
  window.history.pushState(null, "", url);
}

function traverse(delta: number) {
  entries[entryIndex].state = window.history.state;
  entryIndex += delta;
  const { state, url } = entries[entryIndex];
  window.history.replaceState(state, "", url);
}

/** A view with one content page, whose scroller leaves the scroll to the page, as on a phone. */
function phoneView(aside = "") {
  const view = document.createElement("div");
  view.innerHTML = `<div><section data-split-view-column="content"><div data-split-view-pages>
    <div data-split-view-page="current"><div></div></div>${aside}
  </div></section></div>`;
  document.body.append(view);
  boxOfObserved.set(view, documentBox);
  return view;
}

/** A view whose content page scrolls in its own column, as on a wide screen. */
function columnView() {
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

function mountShell(view: HTMLElement, isOpening = false) {
  const shell = createPageScroll(view, "page", () => {}, true, isOpening);
  mounted.push(shell);
  return shell;
}

function mountSkeleton(view: HTMLElement) {
  return mountShell(view, true);
}

function hidePage() {
  window.dispatchEvent(new Event("pagehide"));
}

/** Mounts a view at the entry, as a reload does, and gives where it goes. */
function scrollAfterReload(entry: unknown) {
  window.history.replaceState(entry, "", "/report");
  documentBox.place(0);
  scrollTo.mockClear();
  const reloaded = mountShell(phoneView());
  const top = scrollTo.mock.lastCall?.[0].top;
  reloaded.destroy();
  return top;
}

/** A scroll that the visitor makes with no input the view hears, as with a scroll bar. */
function scrollPage(top: number) {
  documentBox.scrollTo(top);
  frame();
}

function tap() {
  window.dispatchEvent(new Event("touchstart"));
}

function startDrag() {
  tap();
  window.dispatchEvent(new Event("touchmove"));
}

function dragPage(top: number) {
  startDrag();
  scrollPage(top);
}

describe("createPageScroll across views", () => {
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

  it("takes the page back to where it was when Back mounts a new view at the entry", () => {
    const view = phoneView();
    const left = mountShell(view);
    scrollPage(900);

    visit("/settings");
    left.destroy();
    documentBox.place(0);
    const settings = mountShell(view);
    expect(scrollTo).not.toHaveBeenCalled();

    settings.destroy();
    traverse(-1);
    const back = mountShell(view);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 900,
      behavior: "instant",
    });
    back.destroy();
  });

  it("keeps the scroll of the entry while a navigation that starts shows another page", () => {
    const view = phoneView();
    const left = mountShell(view);
    scrollPage(900);

    left.remember();
    left.follow("other", "push");
    scrollPage(120);
    visit("/other");
    left.destroy();

    traverse(-1);
    scrollTo.mockClear();
    const back = mountShell(view);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 900,
      behavior: "instant",
    });
    back.destroy();
  });

  it.each([
    { order: "the screen goes first", screenFirst: true },
    { order: "the skeleton goes first", screenFirst: false },
  ])(
    "takes Back to the scroll of the screen, not of the skeleton of a slow tab switch, when $order",
    ({ screenFirst }) => {
      const screen = mountShell(phoneView());
      scrollPage(900);
      screen.hold();

      const skeleton = mountSkeleton(phoneView());
      skeleton.hold();
      scrollPage(375);
      skeleton.hold();

      visit("/settings");
      for (const going of screenFirst
        ? [screen, skeleton]
        : [skeleton, screen]) {
        going.destroy();
      }

      traverse(-1);
      scrollTo.mockClear();
      const back = mountShell(phoneView());
      expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
        top: 900,
        behavior: "instant",
      });
      back.destroy();
    },
  );

  it("starts a pushed page at the top when a loading fallback hears the clamp of the scroll", () => {
    const screen = mountShell(phoneView());
    scrollPage(900);
    screen.hold();
    visit("/settings");
    screen.destroy();

    const fallback = mountShell(phoneView());
    scrollPage(375);
    fallback.destroy();

    scrollTo.mockClear();
    const settings = mountShell(phoneView());
    expect(scrollTo).not.toHaveBeenCalled();
    settings.destroy();
  });

  it("does not move the skeleton of a slow tab switch to the scroll of the entry that the screen leaves", () => {
    const first = mountShell(phoneView());
    scrollPage(900);
    visit("/settings");
    first.destroy();

    traverse(-1);
    const screen = mountShell(phoneView());
    scrollPage(100);
    screen.hold();

    scrollTo.mockClear();
    const skeleton = mountSkeleton(phoneView());
    expect(scrollTo).not.toHaveBeenCalled();
    skeleton.destroy();
    screen.destroy();
  });

  describe("across a navigation of a view that stays mounted", () => {
    function atReport() {
      const shell = mountShell(phoneView());
      scrollPage(900);
      const entry: unknown = window.history.state;
      return { shell, entry };
    }

    function navigateAway(shell: ReturnType<typeof mountShell>) {
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");
      scrollPage(0);
      visit("/other");
      shell.setNavigating(false);
      shell.follow("other", "swap");
    }

    it("keeps each scroll at an entry that Back shows again", () => {
      const { shell, entry } = atReport();
      navigateAway(shell);

      shell.remember(true);
      traverse(-1);
      shell.follow("page", "pop");
      expect(window.scrollY).toBe(900);

      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    describe("while the old page stays on the screen after Back", () => {
      function backThatTheRouterHolds(shell: ReturnType<typeof mountShell>) {
        navigateAway(shell);
        shell.remember(true);
        traverse(-1);
        vi.advanceTimersByTime(1100);
        scrollPage(150);
      }

      it("does not keep a scroll of the old page for the entry that Back shows", () => {
        const { shell, entry } = atReport();
        backThatTheRouterHolds(shell);

        shell.follow("page", "pop");
        expect(window.scrollY).toBe(900);

        hidePage();
        shell.destroy();
        expect(scrollAfterReload(entry)).toBe(900);
      });

      it("takes a view that replaces the old one to the scroll of the entry", () => {
        const { shell } = atReport();
        backThatTheRouterHolds(shell);
        shell.destroy();

        scrollTo.mockClear();
        mountShell(phoneView());
        expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
          top: 900,
          behavior: "instant",
        });
      });

      it("does the same where the column scrolls", () => {
        const { view, box } = columnView();
        const shell = mountShell(view);
        box.scrollTo(900);
        frames();
        shell.remember();
        shell.setNavigating(true);
        shell.follow("other", "push");
        visit("/other");
        shell.setNavigating(false);
        frames();

        shell.remember(true);
        traverse(-1);
        box.scrollTo(150);
        frames();
        shell.follow("page", "pop");
        expect(box.top).toBe(900);
      });

      it.each([
        { motion: "no motion", hasMotion: false },
        { motion: "a motion of the same page", hasMotion: true },
      ])(
        "keeps each scroll for a reload when the step stays at the same page, with $motion",
        ({ hasMotion }) => {
          const { shell, entry } = atReport();
          navigateAway(shell);
          shell.remember(true);
          traverse(-1);
          vi.advanceTimersByTime(1100);

          scrollPage(1400);
          if (hasMotion) shell.follow("other", null);
          hidePage();
          shell.destroy();
          expect(scrollAfterReload(entry)).toBe(1400);
        },
      );

      it("keeps each scroll for the next steps when the step stays at the same page", () => {
        const { shell } = atReport();
        navigateAway(shell);
        shell.remember(true);
        traverse(-1);
        vi.advanceTimersByTime(1100);
        scrollPage(1400);

        shell.remember(true);
        traverse(1);
        shell.follow("detail", "swap");
        shell.remember(true);
        traverse(-1);
        shell.follow("page", "swap");
        expect(window.scrollY).toBe(1400);
      });
    });

    it("takes the page back to its scroll when the navigation is cancelled, and keeps later scrolls", () => {
      const { shell, entry } = atReport();
      shell.remember();
      shell.setNavigating(true);
      scrollPage(375);

      shell.setNavigating(false);
      expect(window.scrollY).toBe(900);

      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    it("gives the entry back after a click that starts no navigation", () => {
      const { shell, entry } = atReport();
      shell.remember();
      scrollPage(375);
      vi.advanceTimersByTime(1100);

      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    it("keeps the scroll of the first navigation when a second one starts during it", () => {
      const { shell, entry } = atReport();
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");

      shell.remember();
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(900);
    });

    it("gives the entry back when a step of the browser ends a pending navigation", () => {
      const { shell, entry } = atReport();
      shell.remember();
      shell.setNavigating(true);

      shell.remember(true);
      vi.advanceTimersByTime(1100);
      scrollPage(1400);
      shell.setNavigating(false);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    it("gives the entry back when the page comes back from the back/forward cache", () => {
      const { shell, entry } = atReport();
      shell.remember();
      hidePage();

      window.dispatchEvent(
        Object.assign(new Event("pageshow"), { persisted: true }),
      );
      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });
  });

  describe("restoring a scroll that the content is still too short for", () => {
    /** Content that lets the page scroll to 300 and no further. */
    const SHORT = 300 + SCREEN_HEIGHT;

    function atReportThenOther() {
      const shell = mountShell(phoneView());
      scrollPage(900);
      const entry: unknown = window.history.state;
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");
      visit("/other");
      shell.setNavigating(false);
      shell.follow("other", "swap");
      frames();
      return { shell, entry };
    }

    function backToShortReport(shell: ReturnType<typeof mountShell>) {
      shell.remember(true);
      traverse(-1);
      documentBox.setHeight(SHORT);
      shell.follow("page", "swap");
    }

    function restoreOnShortReport() {
      const { shell, entry } = atReportThenOther();
      backToShortReport(shell);
      expect(window.scrollY).toBe(300);
      return { shell, entry };
    }

    function savedAfterReload(
      shell: ReturnType<typeof mountShell>,
      entry: unknown,
    ) {
      hidePage();
      shell.destroy();
      return scrollAfterReload(entry);
    }

    it("reaches the scroll on Back as the content grows, and keeps it", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      expect(window.scrollY).toBe(300);

      documentBox.setHeight(500 + SCREEN_HEIGHT);
      frames();
      expect(window.scrollY).toBe(500);

      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("reaches the scroll on Forward as the content grows, and keeps it", () => {
      const { shell } = atReportThenOther();
      scrollPage(500);
      const otherEntry: unknown = window.history.state;
      shell.remember(true);
      traverse(-1);
      shell.follow("page", "swap");
      frames();

      shell.remember(true);
      traverse(1);
      documentBox.setHeight(200 + SCREEN_HEIGHT);
      shell.follow("other", "swap");
      frames();
      expect(window.scrollY).toBe(200);

      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(500);

      hidePage();
      shell.destroy();
      window.history.replaceState(otherEntry, "", "/other");
      documentBox.place(0);
      scrollTo.mockClear();
      mountShell(phoneView()).destroy();
      expect(scrollTo.mock.lastCall?.[0].top).toBe(500);
    });

    it("stops and keeps where the visitor goes when the visitor scrolls", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      dragPage(120);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("stops and keeps where the visitor goes when a scroll comes with no input, as from a scroll bar", () => {
      const first = mountShell(phoneView());
      scrollPage(900);
      const entry: unknown = window.history.state;
      hidePage();
      first.destroy();

      documentBox.place(0);
      documentBox.setHeight(SHORT);
      const shell = mountShell(phoneView());
      frames();
      expect(window.scrollY).toBe(300);

      scrollPage(120);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("does not take the clamp for the visitor's scroll when an input comes before its event", () => {
      const { shell, entry } = restoreOnShortReport();
      startDrag();
      frames();
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("does not take the clamp of content that shrinks and regrows after a tap for the visitor's scroll", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      tap();
      documentBox.setHeight(100 + SCREEN_HEIGHT);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("does not take the clamp of content that shrinks and regrows after a key that does not scroll for the visitor's scroll", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
      documentBox.setHeight(100 + SCREEN_HEIGHT);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("keeps where a key scrolls to while the content grows", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      documentBox.setHeight(TALL);
      scrollPage(120);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("keeps where a finger drags to while the content grows", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(TALL);
      scrollPage(120);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("keeps the scroll while the content never grows enough", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      expect(window.scrollY).toBe(300);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("keeps the scroll when a link is pressed before the content grows", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      tap();
      shell.remember();
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("goes on when the same page swaps its loading content", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      shell.follow("page", "swap");
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("goes on when the content gets shorter first", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      documentBox.setHeight(100 + SCREEN_HEIGHT);
      frames();
      expect(window.scrollY).toBe(100);

      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("goes on when the content gets shorter and then taller before the event of the clamp", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      documentBox.setHeight(100 + SCREEN_HEIGHT);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("counts one scroll of the visitor after an input when the content grew first", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      startDrag();
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(300);

      scrollPage(700);
      expect(savedAfterReload(shell, entry)).toBe(700);
    });

    it("keeps where the visitor goes when the content grows and the scroll comes before the resize", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(TALL);
      scrollPage(120);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("keeps where the visitor goes when the visitor scrolls to the end of content that grew before the resize", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(500 + SCREEN_HEIGHT);
      scrollPage(500);
      expect(savedAfterReload(shell, entry)).toBe(500);
    });

    it("does not take the clamp for the visitor's scroll when the content gets shorter after an input", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(100 + SCREEN_HEIGHT);
      frames();
      expect(window.scrollY).toBe(100);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("gives a pop in the view the scroll, not the clamp, of a page that left before it grew", () => {
      const { shell } = restoreOnShortReport();
      frames();

      shell.remember();
      shell.follow("detail", "push");
      documentBox.setHeight(TALL);
      frames();

      shell.remember();
      shell.follow("page", "pop");
      expect(window.scrollY).toBe(900);
      shell.destroy();
    });

    it("keeps the scroll of a pop in the view for a reload before the content grows", () => {
      const { shell } = restoreOnShortReport();
      frames();
      shell.remember();
      shell.setNavigating(true);
      shell.follow("detail", "push");
      visit("/detail");
      shell.setNavigating(false);
      frames();

      shell.remember();
      shell.setNavigating(true);
      documentBox.setHeight(SHORT);
      shell.follow("page", "pop");
      visit("/report");
      shell.setNavigating(false);
      hidePage();
      shell.destroy();
      const entry: unknown = window.history.state;
      expect(scrollAfterReload(entry)).toBe(900);
    });

    it("keeps a leaving page at its own scroll while the page that shows grows", () => {
      const view = phoneView(
        '<div data-split-view-page="leaving" data-split-view-page-key="other"><div></div></div>',
      );
      const shell = mountShell(view);
      scrollPage(900);
      shell.remember();
      shell.follow("other", "push");
      visit("/other");
      frames();
      scrollPage(500);
      frames();

      shell.remember(true);
      traverse(-1);
      documentBox.setHeight(SHORT);
      shell.follow("page", "swap");
      frames();
      documentBox.setHeight(TALL);
      frames();

      const leaving = view.querySelector<HTMLElement>(
        '[data-split-view-page="leaving"]',
      );
      expect(window.scrollY).toBe(900);
      expect(leaving?.style.top).toBe("400px");
      shell.destroy();
    });

    it("does the same where the column scrolls", () => {
      const { view, box } = columnView();
      const shell = mountShell(view);
      box.scrollTo(900);
      frames();
      const entry: unknown = window.history.state;
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");
      visit("/other");
      shell.setNavigating(false);
      frames();

      shell.remember(true);
      traverse(-1);
      box.setHeight(SHORT);
      shell.follow("page", "swap");
      frames();
      expect(box.top).toBe(300);

      box.setHeight(TALL);
      frames();
      expect(box.top).toBe(900);

      hidePage();
      shell.destroy();
      window.history.replaceState(entry, "", "/report");
      box.place(0);
      mountShell(view).destroy();
      expect(box.top).toBe(900);
    });
  });

  it("counts a scroll after the clamp of an arrival only once the visitor scrolls", () => {
    documentBox.place(375);
    const fallback = mountShell(phoneView());
    tap();
    scrollPage(400);
    hidePage();
    expect(sessionStorage).toHaveLength(0);

    dragPage(500);
    const entry: unknown = window.history.state;
    hidePage();
    fallback.destroy();
    expect(scrollAfterReload(entry)).toBe(500);
  });
});
