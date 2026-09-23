import { STRIP_MIN_PX } from "./constants.ts";

export interface ExposedStripsInput {
  scrollY: number;
  innerHeight: number;
  bandTop: number;
  bandHeight: number;
  docHeight: number;
}

/**
 * How many CSS px of the visible area the band does not cover. `inside` is
 * inside the document, which is a fault: the main thread moved the band too
 * late. `outside` is the rubber band above or below the document, where the
 * page's own background is the right picture.
 */
export function exposedStrips({
  scrollY,
  innerHeight,
  bandTop,
  bandHeight,
  docHeight,
}: ExposedStripsInput) {
  const bottom = scrollY + innerHeight;
  const inside =
    Math.max(0, bandTop - Math.max(scrollY, 0)) +
    Math.max(0, Math.min(bottom, docHeight) - (bandTop + bandHeight));
  const outside = Math.max(0, -scrollY) + Math.max(0, bottom - docHeight);
  return { inside, outside };
}

export interface StripCounter {
  /** How many times a strip opened. */
  events: number;
  worstPx: number;
  /** How long strips were open in all, in ms. */
  ms: number;
  openedAt: number;
  open: boolean;
}

export const EMPTY_STRIP_COUNTER: StripCounter = {
  events: 0,
  worstPx: 0,
  ms: 0,
  openedAt: 0,
  open: false,
};

/**
 * Counts one strip from the frame it opens to the frame it closes, however
 * many frames it stays open.
 */
export function noteStrip(
  counter: StripCounter,
  px: number,
  now: number,
): StripCounter {
  if (px > STRIP_MIN_PX) {
    const opening = !counter.open;
    return {
      events: opening ? counter.events + 1 : counter.events,
      worstPx: Math.max(counter.worstPx, px),
      ms: counter.ms,
      openedAt: opening ? now : counter.openedAt,
      open: true,
    };
  }
  if (!counter.open) return counter;
  return {
    ...counter,
    ms: counter.ms + now - counter.openedAt,
    open: false,
  };
}
