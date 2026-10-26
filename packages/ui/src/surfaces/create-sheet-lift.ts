import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import type { MotionValue } from "../motion/create-motion-value.ts";
import {
  copyForMotion,
  opaqueFillOf,
  readSharedForm,
} from "../motion/fly-shared.ts";
import { mix, smoothstep, unit } from "../motion/mix.ts";
import { overlaps, type Rect } from "../motion/play-layout.ts";
import { px, writeStyles, type Styles } from "../motion/px.ts";
import { recededRect } from "./sheet-recede-context.ts";

/** @internal */
export function boxOf(element: Element): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left, y: top, width, height };
}

/**
 * The elements on the page that show over `origin`, such as a button that
 * floats over a list, as `origin` is at `box`. Each is the outermost
 * element that does not hold `origin`. The elements in `own` do not count.
 *
 * @internal
 */
export function coversOf(
  origin: Element,
  box: Rect,
  own: readonly Element[],
): HTMLElement[] {
  const covers = new Set<HTMLElement>();
  for (const row of [0.1, 0.5, 0.9]) {
    for (const column of [0.02, 0.25, 0.5, 0.75, 0.98]) {
      const hits = document.elementsFromPoint(
        box.x + box.width * column,
        box.y + box.height * row,
      );
      for (const hit of hits) {
        if (hit.contains(origin) || origin.contains(hit)) break;
        if (own.some((element) => element.contains(hit))) continue;
        let cover = hit;
        while (
          cover.parentElement !== null &&
          !cover.parentElement.contains(origin)
        ) {
          cover = cover.parentElement;
        }
        if (cover instanceof HTMLElement) covers.add(cover);
      }
    }
  }
  return [...covers];
}

/** Puts `copy`, a copy that a lift shows, over its layer, out of reach of the pointer and of assistive technology. */
function showOnTop(copy: HTMLElement) {
  copy.style.zIndex = "1";
  copy.style.pointerEvents = "none";
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
}

/** The styles that shape the corners of a box. */
const CORNER_STYLES = [
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "corner-top-left-shape",
  "corner-top-right-shape",
  "corner-bottom-right-shape",
  "corner-bottom-left-shape",
];

/** A move of the origin, in px, that the lift does not follow. */
const STILL = 0.5;

/**
 * The three boxes between a Sheet's mover and its card, outermost first.
 *
 * @internal
 */
export type SheetClips = readonly [HTMLElement, HTMLElement, HTMLElement];

/**
 * The parts of a Sheet that a lift moves.
 *
 * @internal
 */
export interface SheetLiftParts {
  readonly card: HTMLElement;
  readonly mover: HTMLElement;
  /** The three boxes between the mover and the card, outermost first, that clip the card while it lifts. */
  readonly clips: SheetClips;
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
  /** The elements that showed over `origin` as the lift started. */
  readonly covers: readonly HTMLElement[];
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
 * and the card's content fades in late. The window is the part that the
 * card and each box in `clips` have in common: each has the corners of the
 * card, and each box moves one of its corners onto a corner of the window.
 * The card and the boxes move only by transforms, so the compositor moves
 * the window and the card together, also while the page is busy. What
 * shows over `origin`, such as a button that floats over a list, shows
 * over the card as a copy that fades out early, in the box that holds the
 * card, which does not move. Thus the card does not jump over it. Where
 * `origin` is in the element that recedes, the window starts where
 * `origin` shows as that element moves back. Each frame that the lift
 * moves, it reads the box of `origin` again, before the frame writes, and
 * follows it where the page under the card moved it. Where `knownCovers`
 * gives what showed over `origin` before, such as when the card lifted out of
 * it, the lift takes those of them that still show over it. To find them
 * again, the browser must test each point through the card and its
 * content, which takes long.
 *
 * @internal
 */
export function createSheetLift(
  engine: MotionEngine,
  origin: HTMLElement,
  { card, mover, clips, dim, content, recede }: SheetLiftParts,
  values: SheetLiftValues,
  rest: Rect,
  knownCovers: readonly HTMLElement[] | null = null,
): SheetLift {
  const cardStyle = getComputedStyle(card);
  const clipShape = Object.fromEntries(
    CORNER_STYLES.map((property) => [
      property,
      cardStyle.getPropertyValue(property),
    ]),
  );
  for (const clip of clips)
    writeStyles(clip, { ...clipShape, overflow: "clip" });
  const backing = recede !== null && recede.contains(origin) ? recede : null;
  const layer = mover.parentElement ?? mover;
  // The lift moves the full card sideways, and the clip boxes show only a
  // part of it. The card can thus make the document wider than the screen,
  // so the layer clips sideways. Do not keep this clip after the lift. When
  // the layer has no height and clips on one axis only, Safari on iOS does
  // not paint the card after its motion stops.
  mover.parentElement?.style.setProperty("overflow-x", "clip");
  const [place, box, layerBox, covers] = engine.measure(() => {
    const originBox = boxOf(origin);
    return [
      backing === null ? null : boxOf(backing),
      originBox,
      boxOf(layer),
      knownCovers === null
        ? coversOf(origin, originBox, [layer, dim]).map(
            (cover) => [cover, boxOf(cover)] as const,
          )
        : knownCovers
            .filter((cover) => cover.isConnected)
            .map((cover) => [cover, boxOf(cover)] as const)
            .filter(([, coverBox]) => overlaps(coverBox, originBox)),
    ] as const;
  });
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
  showOnTop(ghost);
  if (ghost.firstElementChild instanceof HTMLElement) {
    ghost.firstElementChild.style.backgroundColor = opaqueFillOf(origin);
  }
  const coverCopies = covers.map(([cover, coverBox]) => {
    const copy = copyForMotion(
      readSharedForm(cover, {
        x: coverBox.x - layerBox.x,
        y: coverBox.y - layerBox.y,
        width: coverBox.width,
        height: coverBox.height,
      }),
      layer,
    );
    showOnTop(copy);
    if (copy.firstElementChild instanceof HTMLElement) {
      copy.firstElementChild.style.position = "relative";
      copy.firstElementChild.style.inset = "auto";
    }
    return [copy, coverBox, backing?.contains(cover) === true] as const;
  });

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

  const gapAt = (at: number, page: number) => {
    const start = fromAt(page);
    return {
      x: Math.max(
        0,
        rest.width - Math.max(1, mix(start.width, rest.width, at)),
      ),
      y: Math.max(
        0,
        rest.height - Math.max(1, mix(start.height, rest.height, at)),
      ),
    };
  };
  const shift = (x: number, y: number): Styles => ({
    transform: `translate(${px(x)}, ${px(y)})`,
  });
  // Each box moves one corner onto the window, and the next box moves back
  // by the same distance. Thus the card does not move in its boxes.
  const [toRight, toBottom, toLeft] = clips;
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
    showOn(toRight, (at, _down, page) => shift(-gapAt(at, page).x, 0)),
    showOn(toBottom, (at, _down, page) => shift(0, -gapAt(at, page).y)),
    showOn(toLeft, (at, _down, page) => shift(gapAt(at, page).x, 0)),
    showOn(card, (at, _down, page) => shift(0, gapAt(at, page).y)),
  ];
  const fades = [
    showOn(ghost, (at) => ({
      opacity: (1 - smoothstep(0, 0.5, at)).toFixed(3),
    })),
    ...coverCopies.map(([copy, coverBox, recedes]) =>
      showOn(copy, (at, _down, page) => {
        const shown =
          recedes && place !== null
            ? recededRect(coverBox, place, page)
            : coverBox;
        return {
          transform: `translate(${px(shown.x - coverBox.x)}, ${px(shown.y - coverBox.y)}) scale(${(shown.width / coverBox.width).toFixed(4)})`,
          opacity: (1 - smoothstep(0, 0.25, at)).toFixed(3),
        };
      }),
    ),
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
    covers: covers.map(([cover]) => cover),
    stop() {
      for (const stopOne of stopFollowing) stopOne();
      for (const binding of [...fromBindings, ...fades]) binding.unbind();
      ghost.remove();
      for (const [copy] of coverCopies) copy.remove();
      for (const clip of clips) {
        for (const property of [...CORNER_STYLES, "overflow"]) {
          clip.style.removeProperty(property);
        }
      }
      mover.parentElement?.style.removeProperty("overflow-x");
    },
  };
}
