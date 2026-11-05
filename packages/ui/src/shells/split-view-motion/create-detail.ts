import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import type { MotionValue } from "../../motion/create-motion-value.ts";
import { px, type Styles } from "../../motion/px.ts";
import { springRoles } from "../../motion/spring-roles.ts";
import {
  edgeOf,
  edgeOpacity,
  show,
  showAll,
  springValue,
  unbindAll,
} from "./show.ts";
import type { Part } from "./types.ts";

/**
 * The detail column, which comes in from the inline end and goes back there.
 *
 * @internal
 */
export interface Detail extends Part {
  readonly progress: MotionValue;
  readonly column: HTMLElement;
  /** How far, in px, the column is from its place at `progress`. */
  readonly offsetAt: (progress: number) => number;
}

/** @internal */
export function createDetail(
  engine: MotionEngine,
  column: HTMLElement,
  width: number,
  fill: string,
  initial: number,
): Detail {
  const progress = springValue(engine, initial, springRoles.columnPush);
  const bindings = showAll(progress, [
    {
      element: column,
      pose: (p) => ({
        transform: `translateX(${px(width * (1 - p))})`,
        visibility: p <= 0.001 ? "hidden" : "visible",
        "background-color": fill,
      }),
    },
    { element: edgeOf(column), pose: (p) => ({ opacity: edgeOpacity(p) }) },
  ]);
  return {
    progress,
    column,
    offsetAt: (p) => width * (1 - p),
    isMoving: () => progress.isMoving,
    drop() {
      unbindAll(bindings);
      progress.stop();
    },
  };
}

/**
 * The content column, which springs from where it showed to its new place
 * beside the sidebar, over what is next to it. While a detail column comes
 * in or goes out at its inline end, the inline end of the content stays the
 * gap between the columns from the inline start of the detail column: the
 * fill of the content reaches that far, and the content is clipped there.
 * Thus the gap does not change and no overlap shows while each moves on its
 * own spring.
 *
 * @internal
 */
export interface Offset extends Part {
  readonly x: MotionValue;
}

/** A detail column that moves at the inline end of the content. */
interface Beside {
  readonly detail: Detail;
  /**
   * How far, in px, the inline start of the column is from the inline end of
   * the content, both at their places, less the gap between the columns.
   */
  readonly edge: number;
  /**
   * How far, in px, the inline end of the content at its place is from the
   * inline end of the box that holds the columns, inside its padding. The
   * content never shows past that end, also while the column overshoots.
   */
  readonly room: number;
}

/** A clip inset that keeps what the content paints outside its box. */
const UNCLIPPED = "-100vmax";

/** @internal */
export function createOffset(
  engine: MotionEngine,
  content: HTMLElement,
  dx: number,
  velocity: number,
  fill: string,
  beside: Beside | null,
): Offset {
  const x = springValue(engine, dx, springRoles.fold);
  x.to(0, { velocity });
  const pose = (at: number): Styles => ({
    "z-index": "1",
    "background-color": fill,
    transform: `translate(${px(at)}, ${px(0)})`,
  });
  const binding =
    beside === null
      ? show(content, x, pose)
      : show(content, [x, beside.detail.progress], (at, progress) => {
          const gap = Math.min(
            beside.edge + beside.detail.offsetAt(progress) - at,
            beside.room - at,
          );
          const reach = `${px(gap)} 0 0 0 ${fill}`;
          return {
            ...pose(at),
            "box-shadow": gap <= 0 ? "none" : reach,
            "clip-path": `inset(${UNCLIPPED} ${px(-gap)} ${UNCLIPPED} ${UNCLIPPED})`,
          };
        });
  return {
    x,
    isMoving: () => x.isMoving || beside?.detail.isMoving() === true,
    drop() {
      binding.unbind();
      x.stop();
    },
  };
}
