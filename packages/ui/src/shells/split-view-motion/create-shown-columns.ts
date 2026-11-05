import { isShown, SELECTOR } from "./is-view-stacked.ts";

type SidebarForm = "full" | "collapsed" | null;

/**
 * The content column and the sidebar as the screen showed them last. A
 * `ResizeObserver` keeps them, and each motion keeps the layout it plays to.
 */
interface ShownColumns {
  /** Where the inline-start edge of the content is at its place, from the view's. */
  readonly x: number;
  readonly width: number;
  readonly sidebar: SidebarForm;
}

/** The columns from `box`, the box of the content column `slide` px from its place, in the view at `origin`. */
function columnsOf(
  box: DOMRect,
  origin: DOMRect,
  slide: number,
  sidebar: SidebarForm,
): ShownColumns {
  return { x: box.left - origin.left - slide, width: box.width, sidebar };
}

/** @internal */
export interface ShownColumnsWatch {
  readonly shown: ShownColumns | null;
  watch(content: HTMLElement | null): void;
  keep(box: DOMRect, origin: DOMRect, sidebar: SidebarForm): ShownColumns;
  sidebarShown(): SidebarForm;
  disconnect(): void;
}

/** @internal */
export function createShownColumns(
  view: HTMLElement,
  slideNow: () => number,
): ShownColumnsWatch {
  let shown: ShownColumns | null = null;
  let watched: HTMLElement | null = null;
  // A `ResizeObserver` runs after the layout of each frame, so a read of
  // the layout in it costs nothing. In the commit of a change, the box that
  // it kept is still the box that the screen showed.
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          remember();
        });
  watch(view.querySelector<HTMLElement>(SELECTOR.content));

  function remember() {
    const content = watched;
    if (content === null) return;
    if (!content.isConnected) {
      watch(view.querySelector<HTMLElement>(SELECTOR.content));
      return;
    }
    const last = shown;
    const columns = columnsOf(
      content.getBoundingClientRect(),
      view.getBoundingClientRect(),
      slideNow(),
      last?.sidebar ?? null,
    );
    // The observer runs at each frame while the view changes size. The
    // sidebar shows at the inline start of the content, so another form of
    // the sidebar moves the content. Only then read the sidebar again.
    const isSameSidebar = last !== null && Math.abs(columns.x - last.x) < 0.5;
    shown = isSameSidebar ? columns : { ...columns, sidebar: sidebarShown() };
  }

  function watch(content: HTMLElement | null) {
    if (content === watched) return;
    if (watched !== null) observer?.unobserve(watched);
    watched = content;
    shown = null;
    if (content !== null) observer?.observe(content);
  }

  function sidebarShown() {
    const full = view.querySelector(SELECTOR.fullSidebar);
    const collapsed = view.querySelector(SELECTOR.collapsedSidebar);
    if (full !== null && isShown(full)) return "full";
    if (collapsed !== null && isShown(collapsed)) return "collapsed";
    return null;
  }

  return {
    get shown() {
      return shown;
    },
    watch,
    keep(box, origin, sidebar) {
      const columns = columnsOf(box, origin, 0, sidebar);
      shown = columns;
      return columns;
    },
    sidebarShown,
    disconnect() {
      observer?.disconnect();
    },
  };
}
