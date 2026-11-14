import { isDarkBackground } from "../../effect-layer/dust-color.ts";
import { parseCssColor } from "../../effect-layer/parse-css-color.ts";
import { readPageBackdrop } from "../../effect-layer/plan-scopes.ts";
import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../../motion/create-motion-value.ts";
import { unit } from "../../motion/mix.ts";
import type { Rect } from "../../motion/play-layout.ts";
import { px, writeStyles, type Styles } from "../../motion/px.ts";
import { springRoles } from "../../motion/spring-roles.ts";
import {
  CROSS_FADE,
  edgeOf,
  edgeOpacity,
  show,
  showAll,
  springValue,
  unbindAll,
  type Pose,
} from "./show.ts";
import type { Part } from "./types.ts";

/** How far the screen under a new one moves back, as a share of its width. */
const PARALLAX = { columns: 0.28, stacked: 0.3 } as const;
/** How dark the screen under a new one gets. */
const DIM = {
  columns: { light: 0.07, dark: 0.21 },
  stacked: { light: 0.1, dark: 0.5 },
} as const;
/** The progress at which the new screen is out, and the progress above which it shows again. */
const OUT_BELOW = 0.001;
const IN_ABOVE = 0.01;
/** The opacity of `color.overlay`, which the dim layer paints. */
const SCRIM_OPACITY = 0.7;

/** Whether `fill`, a fill from `opaqueFillOf`, is dark. */
function isDark(fill: string) {
  const color = parseCssColor(fill);
  return isDarkBackground(
    color !== null && color[3] > 0.99 ? color : readPageBackdrop(),
  );
}

function dimOf(page: HTMLElement) {
  return page.querySelector<HTMLElement>(":scope > [data-split-view-dim]");
}

/**
 * The screen under a new one and the new one: the new one comes in from the
 * inline end over the one under it, which moves back a little and dims.
 * `progress` is 1 where the new one is in.
 *
 * @internal
 */
export interface Push extends Part {
  readonly progress: MotionValue;
  /** Fades the new screen out where it is, in place of the move out, as under reduced motion. */
  fadeOut(): void;
  /** Whether `fadeOut` started. */
  readonly isFadingOut: boolean;
  readonly front: HTMLElement;
  readonly back: HTMLElement | null;
  /** Where the inline-start edge of the new screen is at `progress`, from the view's. */
  readonly edgeAt: (progress: number) => number;
  setBack(back: HTMLElement | null): void;
  /** Moves the new screen to `front`, and leaves the one it was where it shows now. */
  setFront(front: HTMLElement): void;
}

/** @internal */
export function createPush(
  engine: MotionEngine,
  initialBack: HTMLElement | null,
  initialFront: HTMLElement,
  { x: left, width }: Rect,
  presentation: "columns" | "stacked",
  fill: string,
  initial: number,
  isReduced = false,
  isInStack = false,
): Push {
  const progress = springValue(
    engine,
    initial,
    presentation === "columns" ? springRoles.columnPush : springRoles.stackPush,
  );
  const faded = createMotionValue(engine, 0);
  const strength = isReduced
    ? 0
    : DIM[presentation][isDark(fill) ? "dark" : "light"];
  const parallax = isReduced ? 0 : PARALLAX[presentation];
  // The spring swings back a little after the new screen is out, which would
  // show a strip of it at the edge. Thus the screen stays hidden until it
  // comes in again by more than that swing.
  let isOut = initial <= OUT_BELOW;
  const frontPose = (p: number, gone: number): Styles => {
    isOut = p <= (isOut ? IN_ABOVE : OUT_BELOW);
    return poseOfFront(p, gone);
  };
  const poseOfFront = (p: number, gone: number): Styles => ({
    // The column around a page of a stack has no fill, so a spring past its
    // end would show the canvas beside the page. Beside the sidebar, it would
    // move the start of the page out of the column.
    transform: `translateX(${px(width * (isInStack ? Math.max(0, 1 - p) : 1 - p))})`,
    visibility: isOut ? "hidden" : "visible",
    "content-visibility": "visible",
    "background-color": fill,
    // A page that leaves comes after the new one in the DOM.
    "z-index": "1",
    opacity: gone > 0 ? (1 - unit(gone)).toFixed(3) : "",
  });
  const showFront = (front: HTMLElement) => [
    show(front, [progress, faded], frontPose),
    ...showAll(progress, [
      { element: edgeOf(front), pose: (p) => ({ opacity: edgeOpacity(p) }) },
      // The sidebar comes before the content in the DOM.
      {
        element: front.closest<HTMLElement>("[data-split-view-sidebar]"),
        pose: () => ({ "z-index": "1" }),
      },
    ]),
  ];
  const backPoses = (back: HTMLElement | null): Pose[] =>
    back === null
      ? []
      : [
          {
            element: back,
            pose: (p) => {
              const shown = unit(p);
              return {
                transform: `translateX(${px(-parallax * width * shown)})`,
                visibility: shown >= 0.999 ? "" : "visible",
                "content-visibility": shown >= 0.999 ? "" : "visible",
                "background-color": fill,
              };
            },
            // Not every browser animates `content-visibility`, so the page
            // under also shows while it moves.
            hold: { "content-visibility": "visible" },
          },
          {
            element: dimOf(back),
            pose: (p) => ({
              opacity: ((unit(p) * strength) / SCRIM_OPACITY).toFixed(3),
            }),
          },
        ];
  let front = initialFront;
  let back = initialBack;
  let frontBindings = showFront(front);
  let backBindings = showAll(progress, backPoses(back));
  return {
    progress,
    get front() {
      return front;
    },
    get back() {
      return back;
    },
    edgeAt: (p) => left + width * (1 - p),
    isMoving: () => progress.isMoving || faded.isMoving,
    fadeOut() {
      progress.stop();
      faded.to(1, { tween: { duration: CROSS_FADE } });
    },
    get isFadingOut() {
      return faded.get() > 0 || faded.isMoving;
    },
    setBack(next) {
      if (next === back) return;
      unbindAll(backBindings);
      back = next;
      backBindings = showAll(progress, backPoses(back));
    },
    setFront(next) {
      const now = progress.get();
      const edge = edgeOf(front);
      unbindAll(frontBindings);
      writeStyles(front, frontPose(now, faded.get()));
      if (edge !== null) writeStyles(edge, { opacity: edgeOpacity(now) });
      front = next;
      frontBindings = showFront(front);
    },
    drop() {
      unbindAll(frontBindings);
      unbindAll(backBindings);
      progress.stop();
      faded.stop();
    },
  };
}
