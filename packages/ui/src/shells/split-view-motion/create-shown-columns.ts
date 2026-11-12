import { SELECTOR } from "./is-view-stacked.ts";

/**
 * The content column as the screen showed it last. A
 * `ResizeObserver` keeps them, and each motion keeps the layout it plays to.
 */
interface ShownColumns {
  /** Where the inline-start edge of the content is at its place, from the view's. */
  readonly x: number;
  readonly width: number;
}

/** The columns from `box`, the box of the content column `slide` px from its place, in the view at `origin`. */
function columnsOf(box: DOMRect, origin: DOMRect, slide: number): ShownColumns {
  return { x: box.left - origin.left - slide, width: box.width };
}

/** @internal */
interface ShownColumnsWatch {
  readonly shown: ShownColumns | null;
  watch(content: HTMLElement | null): void;
  keep(box: DOMRect, origin: DOMRect): ShownColumns;
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
    shown = columnsOf(
      content.getBoundingClientRect(),
      view.getBoundingClientRect(),
      slideNow(),
    );
  }

  function watch(content: HTMLElement | null) {
    if (content === watched) return;
    if (watched !== null) observer?.unobserve(watched);
    watched = content;
    shown = null;
    if (content !== null) observer?.observe(content);
  }

  return {
    get shown() {
      return shown;
    },
    watch,
    keep(box, origin) {
      const columns = columnsOf(box, origin, 0);
      shown = columns;
      return columns;
    },
    disconnect() {
      observer?.disconnect();
    },
  };
}
