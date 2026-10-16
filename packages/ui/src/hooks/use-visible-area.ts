import { useState } from "react";

/**
 * The custom property that holds the bottom of the visible area, in px down
 * from the top of the element's containing block.
 */
export const VISIBLE_BOTTOM_PROPERTY = "--visible-bottom";

/** The custom property that holds the height of the visible area, in px. */
export const VISIBLE_HEIGHT_PROPERTY = "--visible-height";

type ViewportReading = Pick<VisualViewport, "height" | "pageTop" | "scale">;

/**
 * Where the visible area is: `bottom` is how far its bottom is below
 * `containerTop`, both in px from the top of the document, and `height` is
 * its height. The visible area is the visual viewport, so it leaves out an
 * on-screen keyboard and the browser's toolbars. While the page is zoomed it
 * is null, so that a box placed from it stays where it was.
 *
 * It is read in document coordinates, from `pageTop`, not from
 * `visualViewport.offsetTop`: iOS can keep `offsetTop` after the keyboard
 * closes. iOS can also scroll the visual viewport past the end of the
 * document to show a focused field, so `bottom` can be below that end.
 *
 * @internal
 */
export function readVisibleArea(
  viewport: ViewportReading,
  containerTop: number,
) {
  if (viewport.scale > 1.01) return null;
  return {
    bottom: Math.round(viewport.pageTop + viewport.height - containerTop),
    height: Math.round(viewport.height),
  };
}

function readLayoutViewport(): ViewportReading {
  return { height: window.innerHeight, pageTop: window.scrollY, scale: 1 };
}

/** The top of the box that `element` is positioned in, from the top of the document. */
function containerTopOf(element: HTMLElement) {
  const container = element.offsetParent;
  if (!container) return 0;
  return (
    container.getBoundingClientRect().top + container.clientTop + window.scrollY
  );
}

/**
 * Keeps an absolute element told where the visible area is, so that it can
 * place a box in the document at the bottom of what the visitor sees. Attach
 * the returned ref to the element. While it is attached, the element's
 * `--visible-bottom` holds the bottom of the visual viewport in px from the
 * top of the element's containing block, and `--visible-height` holds the
 * height of the visual viewport in px. Read them in CSS, such as
 * `top: var(--visible-bottom)` on an absolute box.
 *
 * The visible area leaves out an on-screen keyboard, so a box placed from it
 * sits on the keyboard. The values never go through React state: a keyboard
 * that opens writes two style properties in the next frame and renders
 * nothing again.
 */
export function useVisibleArea() {
  const [ref] = useState(() => (element: HTMLElement | null) => {
    if (!element) return;
    const viewport = window.visualViewport;
    let lastBottom = Number.NaN;
    let lastHeight = Number.NaN;
    let frame = 0;

    const write = () => {
      frame = 0;
      const containerTop = containerTopOf(element);
      // A page zoomed when the element comes keeps the box on the layout
      // viewport, which is the best place it has.
      const area =
        readVisibleArea(viewport ?? readLayoutViewport(), containerTop) ??
        (Number.isNaN(lastBottom)
          ? readVisibleArea(readLayoutViewport(), containerTop)
          : null);
      if (!area) return;
      if (area.bottom !== lastBottom) {
        lastBottom = area.bottom;
        element.style.setProperty(
          VISIBLE_BOTTOM_PROPERTY,
          `${String(area.bottom)}px`,
        );
      }
      if (area.height !== lastHeight) {
        lastHeight = area.height;
        element.style.setProperty(
          VISIBLE_HEIGHT_PROPERTY,
          `${String(area.height)}px`,
        );
      }
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(write);
    };

    write();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      element.style.removeProperty(VISIBLE_BOTTOM_PROPERTY);
      element.style.removeProperty(VISIBLE_HEIGHT_PROPERTY);
    };
  });
  return ref;
}
