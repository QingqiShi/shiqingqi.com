import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import type { MotionValue } from "../motion/create-motion-value.ts";
import {
  copyForMotion,
  opaqueFillOf,
  readSharedForm,
} from "../motion/fly-shared.ts";
import { mix, smoothstep, unit } from "../motion/mix.ts";
import type { Rect } from "../motion/play-layout.ts";
import { px, type Styles } from "../motion/px.ts";
import { recededRect } from "./sheet-recede-context.ts";

/** @internal */
export function boxOf(element: Element): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left, y: top, width, height };
}

function radiusOf(element: Element) {
  return Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
}

/** A move of the origin, in px, that the lift does not follow. */
const STILL = 0.5;

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
  /** The element that moves back under the card, as `SheetRecedeContext` gives it, or `null`. Its motion is not the lift's. */
  readonly recede: HTMLElement | null;
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
 * How far the page under the card is in, at these values of a lift: 0
 * where the card is in its origin or away, and 1 where it is at rest.
 *
 * @internal
 */
export function liftedPage(at: number, faded: number, lost: number) {
  return unit(at) * unit(faded) * (1 - unit(lost));
}

/**
 * Poses the card of a Sheet so that it lifts out of `origin`, an element
 * on the page such as the row that opened it, and goes back into it. The
 * card shows through a window that grows from the box of `origin` to the
 * card's own box at `rest`, with a copy of `origin` on top that fades out,
 * and the card's content fades in late. Where `origin` is in the element
 * that recedes, the window starts where `origin` shows as that element
 * moves back. Each frame that the lift moves, it reads the box of `origin`
 * again, before the frame writes, and follows it where the page under the
 * card moved it.
 *
 * @internal
 */
export function createSheetLift(
  engine: MotionEngine,
  origin: HTMLElement,
  { card, mover, dim, content, recede }: SheetLiftParts,
  values: SheetLiftValues,
  rest: Rect,
): SheetLift {
  const fromRadius = radiusOf(origin);
  const cardRadius = radiusOf(card);
  const backing = recede !== null && recede.contains(origin) ? recede : null;
  const [place, box] = engine.measure(
    () => [backing === null ? null : boxOf(backing), boxOf(origin)] as const,
  );
  let from = box;
  const ghost = copyForMotion(
    readSharedForm(origin, {
      x: 0,
      y: 0,
      width: box.width,
      height: box.height,
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

  const { progress, drop, shown, loss } = values;
  const lifted = [progress, drop, shown, loss];
  const fromAt = (page: number) =>
    place === null ? from : recededRect(from, place, page);
  const showOn = (
    element: HTMLElement,
    pose: (at: number, down: number, page: number) => Styles,
  ) =>
    bind(element, lifted, {
      pose: (at, down, faded, lost) =>
        pose(at, down, liftedPage(at, faded, lost)),
    });

  const bindFrom = (): Binding[] => [
    showOn(mover, (at, down, page) => {
      const start = fromAt(page);
      const x = mix(start.x, rest.x, at);
      const y = mix(start.y, rest.y + down, at);
      return {
        transform: `translate(${px(x - rest.x)}, ${px(y - rest.y)})`,
        opacity: "1",
      };
    }),
    showOn(card, (at, _down, page) => {
      const start = fromAt(page);
      const width = Math.max(1, mix(start.width, rest.width, at));
      const height = Math.max(1, mix(start.height, rest.height, at));
      return {
        "clip-path": `inset(0 ${px(Math.max(0, rest.width - width))} ${px(Math.max(0, rest.height - height))} 0 round ${px(mix(fromRadius, cardRadius, unit(at)))})`,
      };
    }),
  ];
  const fades = [
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
  let fromBindings = bindFrom();

  /** Where `origin` is at its place with no transform of the element that recedes, as the screen shows it now. */
  function originNow(): Rect {
    const shownBox = boxOf(origin);
    if (backing === null || place === null) return shownBox;
    const backingBox = boxOf(backing);
    const scale = backingBox.width / (backing.offsetWidth || place.width);
    return {
      x: place.x + (shownBox.x - backingBox.x) / scale,
      y: place.y + (shownBox.y - backingBox.y) / scale,
      width: shownBox.width / scale,
      height: shownBox.height / scale,
    };
  }

  function follow() {
    if (!origin.isConnected) return;
    const next = originNow();
    if (
      Math.max(
        Math.abs(next.x - from.x),
        Math.abs(next.y - from.y),
        Math.abs(next.width - from.width),
        Math.abs(next.height - from.height),
      ) < STILL
    ) {
      return;
    }
    from = next;
    for (const binding of fromBindings) binding.unbind();
    fromBindings = bindFrom();
  }
  const isMoving = () => lifted.some((value) => value.isMoving);
  const readNext = () => {
    if (isMoving()) engine.loop.read(follow);
  };
  const stopFollowing = lifted.map((value) => value.subscribe(readNext));

  return {
    stop() {
      for (const stopOne of stopFollowing) stopOne();
      for (const binding of [...fromBindings, ...fades]) binding.unbind();
      ghost.remove();
    },
  };
}
