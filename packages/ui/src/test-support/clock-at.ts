import type { CarrierClock } from "../effect-layer/create-element-tracker.ts";

/**
 * A clock at a window scroll, with the viewport's bottom edge at
 * `viewportBottom` and the content box of each Scroll region at `regions`.
 *
 * @internal
 */
export function clockAt(
  scrollX = 0,
  scrollY = 0,
  viewportBottom: number | (() => number) = 0,
  regions: ReadonlyMap<number, { x: number; y: number }> = new Map(),
): CarrierClock {
  return {
    scrollX,
    scrollY,
    viewportBottom:
      typeof viewportBottom === "number"
        ? () => viewportBottom
        : viewportBottom,
    regionOrigin: (id) => regions.get(id) ?? null,
  };
}
