import { bind } from "../motion/bind.ts";
import type { MotionValue } from "../motion/create-motion-value.ts";
import {
  copyForMotion,
  opaqueFillOf,
  readSharedForm,
} from "../motion/fly-shared.ts";
import { mix, smoothstep, unit } from "../motion/mix.ts";
import type { Rect } from "../motion/play-layout.ts";
import { px, type Styles } from "../motion/px.ts";

/** @internal */
export function boxOf(element: Element): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left, y: top, width, height };
}

function radiusOf(element: Element) {
  return Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
}

/**
 * The parts of a Sheet that a lift moves.
 *
 * @internal
 */
export interface SheetLiftParts {
  readonly card: HTMLElement;
  readonly mover: HTMLElement;
  readonly dim: HTMLElement;
  /** The parts of the card's content, which fade in late. */
  readonly content: readonly HTMLElement[];
}

/**
 * The values that pose a lift: `progress` is 0 where the card is in the
 * element and 1 where it is at rest, `drop` is how far, in px, a drag puts
 * the card down from its rest, `shown` is how far the dimmed page is in,
 * and `loss` is how much of the dimmed page a drag takes away.
 *
 * @internal
 */
export interface SheetLiftValues {
  readonly progress: MotionValue;
  readonly drop: MotionValue;
  readonly shown: MotionValue;
  readonly loss: MotionValue;
}

/** @internal */
export interface SheetLift {
  /** Takes off every style and the copy that the lift made. */
  stop(): void;
}

/**
 * Poses the card of a Sheet so that it lifts out of `origin`, an element
 * on the page such as the row that opened it, and goes back into it. The
 * card shows through a window that grows from the box of `origin` to the
 * card's own box at `rest`, with a copy of `origin` on top that fades out,
 * and the card's content fades in late. `onPage` takes how far the page
 * under the card is in, before the lift reads the box of `origin`, so the
 * card follows `origin` as the page under the card moves.
 *
 * @internal
 */
export function createSheetLift(
  origin: HTMLElement,
  { card, mover, dim, content }: SheetLiftParts,
  { progress, drop, shown, loss }: SheetLiftValues,
  rest: Rect,
  onPage: (page: number) => void,
): SheetLift {
  const fromRadius = radiusOf(origin);
  const cardRadius = radiusOf(card);
  let from = boxOf(origin);
  const ghost = copyForMotion(
    readSharedForm(origin, {
      x: 0,
      y: 0,
      width: from.width,
      height: from.height,
    }),
    card,
  );
  ghost.style.zIndex = "1";
  ghost.style.pointerEvents = "none";
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  if (ghost.firstElementChild instanceof HTMLElement) {
    ghost.firstElementChild.style.backgroundColor = opaqueFillOf(origin);
  }

  // The poses read the box of `origin` once a frame, after the page under
  // the card moves for that frame. Thus they are not pure, and the lift
  // writes once a frame.
  let read = { progress: Number.NaN, page: Number.NaN };
  const sync = (at: number, faded: number, lost: number) => {
    const page = unit(at) * unit(faded) * (1 - unit(lost));
    if (at === read.progress && page === read.page) return page;
    read = { progress: at, page };
    onPage(page);
    if (origin.isConnected) from = boxOf(origin);
    return page;
  };
  const showOn = (
    element: HTMLElement,
    pose: (at: number, down: number, page: number) => Styles,
  ) =>
    bind(element, [progress, drop, shown, loss], {
      pose: (at, down, faded, lost) => pose(at, down, sync(at, faded, lost)),
      renderer: "frame",
    });

  const bindings = [
    showOn(mover, (at, down) => {
      const x = mix(from.x, rest.x, at);
      const y = mix(from.y, rest.y + down, at);
      return {
        transform: `translate(${px(x - rest.x)}, ${px(y - rest.y)})`,
        opacity: "1",
      };
    }),
    showOn(card, (at) => {
      const width = Math.max(1, mix(from.width, rest.width, at));
      const height = Math.max(1, mix(from.height, rest.height, at));
      return {
        "clip-path": `inset(0 ${px(Math.max(0, rest.width - width))} ${px(Math.max(0, rest.height - height))} 0 round ${px(mix(fromRadius, cardRadius, unit(at)))})`,
      };
    }),
    showOn(ghost, (at) => ({
      opacity: (1 - smoothstep(0, 0.5, at)).toFixed(3),
    })),
    ...content.map((element) =>
      showOn(element, (at) => ({
        opacity: smoothstep(0.3, 0.8, at).toFixed(3),
      })),
    ),
    showOn(dim, (_at, _down, page) => ({ opacity: page.toFixed(3) })),
  ];

  return {
    stop() {
      for (const binding of bindings) binding.unbind();
      ghost.remove();
    },
  };
}
