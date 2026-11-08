"use client";

import {
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";
import { boundedBounceSpring } from "../motion/bounded-bounce-spring.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import {
  createMotionValue,
  endOf,
  internalsOf,
  stateAt,
  type MotionValue,
} from "../motion/create-motion-value.ts";
import { px, type Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { useBinding } from "../motion/use-binding.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import {
  cornerStyles,
  plateGroupStyles,
  plateStyles,
} from "./option-card-plate.stylex.ts";

/** The most, in px, that the plate goes past its window before it settles. */
const BOUNCE = 3;
/** The share of the window the plate must cover before its frame and mark come in. */
const ARRIVE = 0.6;
const PRECISION = 0.25;
/** The step, in seconds, at which a travel looks for its sweep and its arrival. */
const SCAN_STEP = 1 / 240;
const ROLE_SPRING = springOf(springRoles.move);

const SIDES = ["x", "y", "w", "h"] as const;

type Side = (typeof SIDES)[number];

type Rect = Readonly<Record<Side, number>>;

function bySide<T>(make: (side: Side) => T): Record<Side, T> {
  return { x: make("x"), y: make("y"), w: make("w"), h: make("h") };
}

const NO_RECT: Rect = { x: 0, y: 0, w: 0, h: 0 };

interface PlateView {
  /** The option whose window the plate has arrived in. */
  readonly arrived: string | null;
  /** The options whose windows can show the plate now. */
  readonly windowed: ReadonlySet<string>;
}

/**
 * The card's box in its group, unrounded, as `offsetTop` rounds to whole
 * pixels. A press scales the card about a point, so this takes the card's
 * own transform off the box.
 */
function measureRect(card: HTMLElement, origin: DOMRect): Rect {
  const box = card.getBoundingClientRect();
  const transform = getComputedStyle(card).transform;
  const { a, d, e, f } =
    transform === "none" || transform === ""
      ? { a: 1, d: 1, e: 0, f: 0 }
      : new DOMMatrix(transform);
  const w = box.width / a;
  const h = box.height / d;
  return {
    x: box.left + box.width / 2 - e - w / 2 - origin.left,
    y: box.top + box.height / 2 - f - h / 2 - origin.top,
    w,
    h,
  };
}

/** The share of `card` that the plate at `plate` covers. */
function coverOf(plate: Rect, card: Rect) {
  const width =
    Math.min(plate.x + plate.w, card.x + card.w) - Math.max(plate.x, card.x);
  const height =
    Math.min(plate.y + plate.h, card.y + card.h) - Math.max(plate.y, card.y);
  if (width <= 0 || height <= 0) return 0;
  return (width * height) / (card.w * card.h);
}

function meets(a: Rect, b: Rect) {
  return coverOf(a, b) > 0;
}

function sameView(a: PlateView, b: PlateView) {
  return (
    a.arrived === b.arrived &&
    a.windowed.size === b.windowed.size &&
    [...a.windowed].every((key) => b.windowed.has(key))
  );
}

/**
 * The plate of one single-select group: one box on four springs that goes
 * to the selected card. The group measures its cards into a snapshot in one
 * read, so that a pose only reads it. A travel plans its arrival and the
 * cards it sweeps from the paths of its springs, so that no script runs
 * while it moves.
 */
function createPlate(
  engine: MotionEngine,
  initial: PlateView,
  show: (view: PlateView) => void,
) {
  const values = bySide(() =>
    createMotionValue(engine, 0, { precision: PRECISION }),
  );
  const list = SIDES.map((side) => values[side]);
  const cards = new Map<string, HTMLElement>();
  const refs = new Map<string, RefCallback<HTMLElement>>();
  let observed = new WeakSet<Element>();
  let rects = new Map<string, Rect>();
  let group: HTMLElement | null = null;
  let observer: ResizeObserver | null = null;
  let target: string | null = null;
  let view = initial;
  let cancelTimers: (() => void)[] = [];

  function update(next: Partial<PlateView>) {
    const merged = { ...view, ...next };
    if (sameView(view, merged)) return;
    view = merged;
    show(view);
  }

  function cancel() {
    for (const stop of cancelTimers) stop();
    cancelTimers = [];
  }

  function observe(element: Element) {
    if (observer === null || observed.has(element)) return;
    observed.add(element);
    observer.observe(element);
  }

  function measure() {
    if (group === null) return;
    const origin = group.getBoundingClientRect();
    rects = new Map(
      [...cards].map(([key, card]) => [key, measureRect(card, origin)]),
    );
  }

  function snapTo(rect: Rect) {
    for (const side of SIDES) values[side].set(rect[side]);
  }

  function rest(key: string) {
    update({ arrived: key, windowed: new Set([key]) });
  }

  function travelTo(key: string, rect: Rect) {
    const spring = boundedBounceSpring(
      ROLE_SPRING,
      SIDES.map((side) => ({
        from: {
          value: values[side].get(),
          velocity: values[side].getVelocity(),
        },
        target: rect[side],
      })),
      BOUNCE,
    );
    for (const side of SIDES) values[side].to(rect[side], { spring });

    const plans = bySide((side) => internalsOf(values[side]).plan());
    const start = engine.loop.now();
    const end = Math.max(start, ...SIDES.map((side) => endOf(plans[side])));
    const plateAt = (time: number): Rect =>
      bySide((side) => stateAt(plans[side], time).value);
    const hasArrived = (time: number) => coverOf(plateAt(time), rect) >= ARRIVE;

    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    let arriveAt: number | null = null;
    let before = start;
    for (let time = start; ; time = Math.min(time + SCAN_STEP, end)) {
      const plate = plateAt(time);
      left = Math.min(left, plate.x);
      top = Math.min(top, plate.y);
      right = Math.max(right, plate.x + plate.w);
      bottom = Math.max(bottom, plate.y + plate.h);
      if (arriveAt === null && hasArrived(time)) {
        let low = before;
        let high = time;
        while (high - low > 1e-3) {
          const middle = (low + high) / 2;
          if (hasArrived(middle)) high = middle;
          else low = middle;
        }
        arriveAt = high;
      }
      before = time;
      if (time >= end) break;
    }
    // The sweep takes one more pixel on each side for the steps of the scan.
    const swept = {
      x: left - 1,
      y: top - 1,
      w: right - left + 2,
      h: bottom - top + 2,
    };

    cancel();
    update({
      arrived: view.arrived === key ? key : null,
      windowed: new Set(
        [...rects].filter(([, at]) => meets(swept, at)).map(([found]) => found),
      ),
    });
    if (view.arrived !== key && arriveAt !== null) {
      if (arriveAt <= start) update({ arrived: key });
      else {
        cancelTimers.push(
          engine.loop.at(arriveAt, () => {
            update({ arrived: key });
          }),
        );
      }
    }
    cancelTimers.push(
      engine.loop.at(end, () => {
        rest(key);
      }),
    );
  }

  /** Puts the plate in the card of `target`: on its spring when it travels. */
  function place(travel: boolean) {
    const rect = target === null ? undefined : rects.get(target);
    if (target === null || rect === undefined) {
      cancel();
      snapTo(NO_RECT);
      update({ arrived: null, windowed: new Set() });
      return;
    }
    const isShown = values.w.target > 0;
    if (isShown && (travel || list.some((value) => value.isMoving))) {
      travelTo(target, rect);
      return;
    }
    cancel();
    snapTo(rect);
    rest(target);
  }

  return {
    values: list,
    rectOf: (key: string) => rects.get(key),
    groupRef: (element: HTMLElement | null) => {
      group = element;
    },
    refOf(key: string) {
      let ref = refs.get(key);
      if (ref === undefined) {
        ref = (card) => {
          if (card === null) return;
          cards.set(key, card);
          observe(card);
          return () => {
            if (cards.get(key) === card) cards.delete(key);
          };
        };
        refs.set(key, ref);
      }
      return ref;
    },
    select(key: string) {
      measure();
      const travel = key !== target;
      target = key;
      place(travel);
    },
    /** A new layout puts the plate in its card again: at once at rest, and on its spring while it travels. */
    observe() {
      if (group === null || typeof ResizeObserver === "undefined") return;
      observer = new ResizeObserver(() => {
        measure();
        place(false);
      });
      observe(group);
      for (const card of cards.values()) observe(card);
      return () => {
        observer?.disconnect();
        observer = null;
        observed = new WeakSet();
        cancel();
      };
    },
  };
}

type Plate = ReturnType<typeof createPlate>;

/**
 * What a card of a plate group knows of the plate.
 *
 * @internal
 */
export interface PlateCard {
  readonly ref: RefCallback<HTMLElement>;
  readonly arrived: boolean;
  /** Whether the card renders its window onto the plate. */
  readonly windowed: boolean;
  readonly values: readonly MotionValue[];
  /** The card's box in the group, from the last time the group measured. */
  readonly rect: () => Rect | undefined;
}

/** @internal */
export const PlateCardContext = createContext<PlateCard | null>(null);

/**
 * The group's side of the plate. It owns the selection: each card registers
 * by its option's value, and the plate goes to the card of `value`, or
 * hides when no card has it.
 *
 * @internal
 */
export function usePlateGroup(value: string) {
  const engine = useMotionEngine();
  const [view, setView] = useState<PlateView>(() => ({
    arrived: value,
    windowed: new Set([value]),
  }));
  const [plate] = useState<Plate>(() => createPlate(engine, view, setView));

  useLayoutEffect(() => {
    plate.select(value);
  }, [plate, value]);
  useEffect(() => plate.observe(), [plate]);

  const cardOf = (key: string): PlateCard => ({
    ref: plate.refOf(key),
    arrived: key === value && view.arrived === key,
    windowed: view.windowed.has(key),
    values: plate.values,
    rect: () => plate.rectOf(key),
  });

  return {
    groupRef: plate.groupRef,
    groupCss: plateGroupStyles.group,
    cardOf,
  };
}

const HIDDEN: Styles = { transform: "none", opacity: "0" };

// The card's pond bends the plate through an SVG filter on the card, and
// WebKit does not draw the card while the plate moves on the compositor.
const RENDERER = "frame";

const CORNERS = [
  { name: "topLeft", right: 0, bottom: 0 },
  { name: "topRight", right: 1, bottom: 0 },
  { name: "bottomLeft", right: 0, bottom: 1 },
  { name: "bottomRight", right: 1, bottom: 1 },
] as const;

/** A corner of the plate: it holds the arc, and stays at its corner. */
function PlateCorner({
  corner: { name, right, bottom },
  plate,
}: {
  corner: (typeof CORNERS)[number];
  plate: PlateCard;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useBinding(ref, plate.values, {
    pose: (x, y, w, h): Styles => {
      const at = plate.rect();
      if (at === undefined || w <= 0) return HIDDEN;
      const dx = x - at.x + right * (w - at.w);
      const dy = y - at.y + bottom * (h - at.h);
      return { transform: `translate(${px(dx)}, ${px(dy)})`, opacity: "1" };
    },
    renderer: RENDERER,
  });
  return (
    <span
      ref={ref}
      css={[plateStyles.piece, plateStyles.corner, cornerStyles[name]]}
    />
  );
}

/** The share of `size` that a band inset by `inset` on both sides covers. */
function bandScale(size: number, base: number, inset: number) {
  const inner = base - 2 * inset;
  return inner > 0 ? Math.max(0, size - 2 * inset) / inner : 0;
}

/**
 * A band of the plate between its corners, across or down. It is flat, so it
 * scales to the plate's size, and fits a plate of any size.
 */
function PlateBand({
  band,
  plate,
}: {
  band: "across" | "down";
  plate: PlateCard;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const insetRef = useRef<{ at: Rect; x: number; y: number } | null>(null);
  useBinding(ref, plate.values, {
    pose: (x, y, w, h): Styles => {
      const at = plate.rect();
      const element = ref.current;
      if (at === undefined || element === null || w <= 0) return HIDDEN;
      if (insetRef.current?.at !== at) {
        const style = getComputedStyle(element);
        insetRef.current = {
          at,
          x: Number.parseFloat(style.left),
          y: Number.parseFloat(style.top),
        };
      }
      const inset = insetRef.current;
      const dx = x - at.x + (w - at.w) / 2;
      const dy = y - at.y + (h - at.h) / 2;
      const sx = bandScale(w, at.w, inset.x);
      const sy = bandScale(h, at.h, inset.y);
      return {
        transform: `translate(${px(dx)}, ${px(dy)}) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`,
        opacity: "1",
      };
    },
    renderer: RENDERER,
  });
  return <span ref={ref} css={[plateStyles.piece, plateStyles[band]]} />;
}

/**
 * The card's window onto the plate of its group: its own copy of the plate,
 * in four corners and two bands, clipped to the card.
 *
 * @internal
 */
export function PlateWindow({ plate }: { plate: PlateCard }) {
  return (
    <span css={plateStyles.layer} aria-hidden>
      <PlateBand band="across" plate={plate} />
      <PlateBand band="down" plate={plate} />
      {CORNERS.map((corner) => (
        <PlateCorner key={corner.name} corner={corner} plate={plate} />
      ))}
    </span>
  );
}
