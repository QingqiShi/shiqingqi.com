import type { PageRect } from "./lens-from-box.ts";
import type { EffectFrame, EffectPointer } from "./types.ts";

/**
 * What the lit edge reads from the frame beside the control.
 *
 * @internal
 */
export interface LightContext {
  readonly pointer: EffectPointer;
  /** The primary pointer can hover, so a pointer that is not down still leans the light. */
  readonly hoverable: boolean;
  readonly viewport: EffectFrame["viewport"];
}

/**
 * The way to the light in the page plane, as a unit vector from a point:
 * the light hangs above and beyond the top-left corner of the viewport, so
 * the highlight shifts a little as the page scrolls the control.
 */
function restLight(
  x: number,
  y: number,
  viewport: EffectFrame["viewport"],
): readonly [number, number] {
  const dx = viewport.x - viewport.width * 0.25 - x;
  const dy = viewport.y - viewport.height * 0.45 - y;
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
}

/** How far past the control's box the pointer still leans the light, in px. */
const LEAN_REACH = 16;

/**
 * The pointer leans the light when it is down on the control, or when it
 * hovers over it with a pointer that can hover. A finger that lifts leaves
 * no hover behind.
 *
 * @internal
 */
export function pointerOver(
  { pointer, hoverable }: Pick<LightContext, "pointer" | "hoverable">,
  box: PageRect,
) {
  return (
    pointer.present &&
    (pointer.pressed || hoverable) &&
    pointer.x > box.x - LEAN_REACH &&
    pointer.x < box.x + box.width + LEAN_REACH &&
    pointer.y > box.y - LEAN_REACH &&
    pointer.y < box.y + box.height + LEAN_REACH
  );
}

/**
 * The way to the light under reduced motion: fixed, so no highlight moves
 * with the pointer or the scroll.
 */
const STILL_LIGHT = [-0.537, -0.844] as const;

/** Seconds of the lean's time constant: about 200 ms to arrive. */
const LEAN_SECONDS = 0.065;

/**
 * The way to the light that a lit edge takes: from above the top-left of
 * the viewport, leaning towards a pointer over the control. Returns the
 * light as a unit vector, and how far it leans and where the pointer was,
 * for the next frame. Under reduced motion the light stays where it is.
 *
 * @internal
 */
export function leanLight(
  context: LightContext,
  previous: {
    readonly lean: number;
    readonly toPointer: readonly [number, number];
  },
  centre: { readonly x: number; readonly y: number },
  box: PageRect,
  delta: number,
  reduced: boolean,
) {
  let { lean, toPointer } = previous;
  if (reduced) {
    return {
      lean: 0,
      toPointer,
      resting: true,
      light: STILL_LIGHT,
    };
  }
  const [restX, restY] = restLight(centre.x, centre.y, context.viewport);
  const over = pointerOver(context, box);
  if (over) {
    const dx = context.pointer.x - centre.x;
    const dy = context.pointer.y - centre.y;
    const length = Math.hypot(dx, dy) || 1;
    toPointer = [dx / length, dy / length];
  }
  const goal = over ? 1 : 0;
  lean = goal + (lean - goal) * Math.exp(-delta / LEAN_SECONDS);
  if (Math.abs(lean - goal) < 0.005) {
    lean = goal;
  }
  const lx = restX + (toPointer[0] - restX) * 0.8 * lean;
  const ly = restY + (toPointer[1] - restY) * 0.8 * lean;
  const length = Math.hypot(lx, ly) || 1;
  return {
    lean,
    toPointer,
    resting: lean === goal,
    light: [lx / length, ly / length] as const,
  };
}
