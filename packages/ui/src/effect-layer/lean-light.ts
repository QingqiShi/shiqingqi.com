import type { EffectFrame, EffectPointer } from "./types.ts";

/**
 * What the lit edge reads from the frame beside the control.
 *
 * @internal
 */
export interface LightContext {
  readonly pointer: EffectPointer;
  readonly viewport: EffectFrame["viewport"];
}

/**
 * The light is a pointer that hovers over the page. A finger that lifts
 * leaves no hover behind, and a finger that is down is not a light.
 *
 * @internal
 */
export function pointerLights(pointer: EffectPointer) {
  return pointer.present && pointer.pointerType !== "touch";
}

/** A unit vector along `[x, y]`, or `fallback` where it has no length. */
function unit(
  x: number,
  y: number,
  fallback: readonly [number, number],
): readonly [number, number] {
  const length = Math.hypot(x, y);
  return length < 1e-6 ? fallback : [x / length, y / length];
}

/**
 * The way to the light with no pointer, in the page plane, as a unit vector
 * from a point: the light is at the top-left corner of the viewport, so the
 * highlight turns as the page scrolls the control.
 */
function restLight(
  x: number,
  y: number,
  viewport: EffectFrame["viewport"],
): readonly [number, number] {
  return unit(viewport.x - x, viewport.y - y, STILL_LIGHT);
}

/**
 * The way to the light under reduced motion: fixed, so no highlight moves
 * with the pointer or the scroll.
 */
const STILL_LIGHT = [-0.537, -0.844] as const;

/**
 * How far from the centre a pointer pulls the light as much as the
 * viewport's corner does, in the radius of the control's surface.
 */
const REACH = 2;

/** Seconds of the lean's time constant: about 200 ms to arrive. */
const LEAN_SECONDS = 0.065;

/**
 * The way to the light that a lit edge takes: towards a pointer that
 * hovers, else towards the top-left corner of the viewport. The pointer's
 * pull grows with its distance from `centre`, in `radius`, so a pointer over
 * the control does not swing the highlight from side to side. Returns the
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
  radius: number,
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
  const rest = restLight(centre.x, centre.y, context.viewport);
  const lights = pointerLights(context.pointer);
  if (lights) {
    toPointer = [
      (context.pointer.x - centre.x) / (radius * REACH),
      (context.pointer.y - centre.y) / (radius * REACH),
    ];
  }
  const goal = lights ? 1 : 0;
  lean = goal + (lean - goal) * Math.exp(-delta / LEAN_SECONDS);
  if (Math.abs(lean - goal) < 0.005) {
    lean = goal;
  }
  const [toX, toY] = unit(rest[0] + toPointer[0], rest[1] + toPointer[1], rest);
  return {
    lean,
    toPointer,
    resting: lean === goal,
    light: unit(
      rest[0] + (toX - rest[0]) * lean,
      rest[1] + (toY - rest[1]) * lean,
      rest,
    ),
  };
}
