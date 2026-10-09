/**
 * The DOM event an element dispatches when its Sweep starts, with the point
 * the flood starts from in `detail`, in viewport coordinates. It bubbles,
 * and the Sweep effect listens for it on `window`.
 *
 * @internal
 */
export const SWEEP_EVENT = "effectsweep";

/**
 * Where a Sweep starts, in viewport coordinates.
 *
 * @internal
 */
export interface SweepDetail {
  readonly clientX: number;
  readonly clientY: number;
}

/**
 * Starts the Sweep of an element registered with `useSweep`: the flood
 * floods out from `(clientX, clientY)` in viewport coordinates.
 *
 * @internal
 */
export function dispatchSweep(element: Element, detail: SweepDetail) {
  element.dispatchEvent(
    new CustomEvent<SweepDetail>(SWEEP_EVENT, { bubbles: true, detail }),
  );
}

/**
 * The point a `SWEEP_EVENT` carries, or `null` for an event without one.
 *
 * @internal
 */
export function readSweepDetail(event: Event): SweepDetail | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }
  const detail: unknown = event.detail;
  if (
    typeof detail !== "object" ||
    detail === null ||
    !("clientX" in detail) ||
    !("clientY" in detail) ||
    typeof detail.clientX !== "number" ||
    typeof detail.clientY !== "number"
  ) {
    return null;
  }
  return { clientX: detail.clientX, clientY: detail.clientY };
}
