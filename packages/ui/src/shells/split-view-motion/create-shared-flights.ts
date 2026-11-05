import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import {
  flyShared,
  readSharedForm,
  type Flight,
  type FlightUnder,
} from "../../motion/fly-shared.ts";
import { captureLayout, rectIn, type Rect } from "../../motion/play-layout.ts";
import {
  springOf,
  springRoles,
  type SpringRole,
} from "../../motion/spring-roles.ts";
import { createHolder, type Holder, type LandedPart } from "./create-holder.ts";
import type { Push } from "./create-push.ts";
import { isShown } from "./is-view-stacked.ts";
import { keepMoving } from "./show.ts";
import type {
  ShownMark,
  SplitViewFlightOptions,
  SplitViewMarkElement,
  SplitViewMarks,
  SplitViewSnapshot,
} from "./types.ts";

/** The time, in seconds, between two Shared elements that set off. */
const STAGGER = { fold: 0.016, other: 0.0096 } as const;

/**
 * `before` with its boxes from the top-left corner of the view at `origin`.
 * Where the page scrolls the view, the view moves between a snapshot and
 * its motion, but the page that leaves still shows where it showed.
 */
function fromOrigin(before: SplitViewSnapshot, origin: DOMRect) {
  if (before.origin === null) return before;
  const dx = before.origin.x - origin.left;
  const dy = before.origin.y - origin.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return before;
  const marks = new Map<string, ShownMark>();
  for (const [name, mark] of before.marks) {
    const { rect } = mark;
    marks.set(name, {
      ...mark,
      rect: { ...rect, x: rect.x + dx, y: rect.y + dy },
    });
  }
  return { ...before, marks };
}

/** Where `element` shows now, as `ShownMark` keeps it. */
function markOf(
  element: SplitViewMarkElement,
  rect: Rect,
  options: SplitViewFlightOptions,
): ShownMark {
  return { ...readSharedForm(element, rect), options };
}

const NOTHING_SHOWN: SplitViewSnapshot = { marks: new Map(), origin: null };

/**
 * Adds an element that the Shared element `name` shows in, and gives the
 * cleanup that takes it off.
 *
 * @internal
 */
export function addSplitViewMark(
  marks: SplitViewMarks,
  name: string,
  element: SplitViewMarkElement,
  options: SplitViewFlightOptions = {},
) {
  let elements = marks.get(name);
  if (elements === undefined) {
    elements = new Map();
    marks.set(name, elements);
  }
  elements.set(element, options);
  return () => {
    elements.delete(element);
    if (elements.size === 0 && marks.get(name) === elements) {
      marks.delete(name);
    }
  };
}

/** @internal */
export interface SharedFlights {
  capture(): SplitViewSnapshot;
  plan(
    snapshot: SplitViewSnapshot | null,
    origin: DOMRect,
    change: "fold" | "unfold" | null,
  ): {
    start: () => void;
    moved: ReadonlyMap<SplitViewMarkElement, Rect>;
    flying: readonly Element[];
  };
  tick(): void;
  dropResting(): void;
  dropAll(): void;
}

/** @internal */
export function createSharedFlights(
  engine: MotionEngine,
  view: HTMLElement,
  layer: HTMLElement,
  marks: SplitViewMarks,
  pushNow: () => Push | null,
): SharedFlights {
  let flights = new Map<string, Flight<ShownMark>>();
  let holders: Holder[] = [];

  /** The one element of the Shared element `name` that shows, in `within` where given, with its options. */
  function shownMark(name: string, within?: Element) {
    const found = [...(marks.get(name) ?? [])].filter(
      ([element]) =>
        (within === undefined || within.contains(element)) && isShown(element),
    );
    return found.length === 1 ? found[0] : null;
  }

  function shownMarks() {
    return [...marks.keys()].flatMap((name) => {
      const found = shownMark(name);
      return found === null
        ? []
        : [{ name, element: found[0], options: found[1] }];
    });
  }

  function fly({
    role,
    ...options
  }: {
    origin: ShownMark;
    destination: ShownMark;
    delay: number;
    role: SpringRole;
    under: FlightUnder | null;
    start?: { value: number; velocity: number };
  }) {
    return flyShared(engine, {
      ...options,
      layer,
      spring: springOf(role),
      fade: options.destination.options.fade,
    });
  }

  /**
   * The edge of the new screen, where a Shared element flies to or from the
   * screen under it, so that it flies under the new screen too.
   */
  function underOf(from: ShownMark, to: ShownMark): FlightUnder | null {
    const current = pushNow();
    const back = current?.back;
    if (current == null || back == null) return null;
    return back.contains(from.element) || back.contains(to.element)
      ? { progress: current.progress, edgeAt: current.edgeAt }
      : null;
  }

  /** Flies each part that a new form has drawn since a holder started to wait for it. */
  function landParts() {
    if (!holders.some((holder) => holder.isWaiting)) return;
    const origin = view.getBoundingClientRect();
    // The page that a form leaves still shows while it moves, so a part
    // is looked for only in the new form.
    const find = (name: string, within: Element) => {
      const found = shownMark(name, within);
      if (found === null) return null;
      const [element, options] = found;
      return markOf(element, rectIn(element, origin), options);
    };
    for (const holder of holders) {
      for (const { name, from, to } of holder.land(find)) {
        flights.get(name)?.drop();
        flights.set(
          name,
          fly({
            origin: from,
            destination: to,
            delay: 0,
            role: springRoles.move,
            under: underOf(from, to),
            start: {
              value: holder.progress.get(),
              velocity: holder.progress.getVelocity(),
            },
          }),
        );
      }
    }
  }

  function plan(
    snapshot: SplitViewSnapshot | null,
    origin: DOMRect,
    change: "fold" | "unfold" | null,
  ) {
    const before = fromOrigin(snapshot ?? NOTHING_SHOWN, origin);
    const after = new Map<string, ShownMark>();
    for (const { name, element, options } of shownMarks()) {
      after.set(name, markOf(element, rectIn(element, origin), options));
    }

    const paired: LandedPart[] = [];
    const moved = new Map<SplitViewMarkElement, Rect>();
    for (const [name, to] of after) {
      const from = before.marks.get(name);
      if (from === undefined) continue;
      if (from.element === to.element) {
        const dx = from.rect.x - to.rect.x;
        const dy = from.rect.y - to.rect.y;
        if (Math.hypot(dx, dy) >= 0.5) moved.set(to.element, from.rect);
      } else {
        paired.push({ name, from, to });
      }
    }
    const holds = (outer: ShownMark, inner: ShownMark) =>
      outer.element !== inner.element && outer.element.contains(inner.element);
    const waitingIn = ({ from }: LandedPart) =>
      [...before.marks]
        .filter(([name, mark]) => !after.has(name) && holds(from, mark))
        .map(([name, mark]) => ({ name, from: mark }));
    const isHolder = (pair: LandedPart) =>
      paired.some(
        (other) => holds(pair.from, other.from) || holds(pair.to, other.to),
      ) || waitingIn(pair).length > 0;
    const isPart = ({ from, to }: LandedPart) =>
      paired.some((other) => holds(other.from, from) || holds(other.to, to));
    const pairs = paired
      .filter((pair) => !isHolder(pair))
      .sort(
        (a, b) =>
          a.from.rect.y - b.from.rect.y || a.from.rect.x - b.from.rect.x,
      );

    const flying = paired.flatMap(({ from, to }) => [from.element, to.element]);

    const start = () => {
      for (const holder of holders) holder.drop();
      holders = paired
        .filter(isHolder)
        .map((pair) => createHolder(engine, pair.to, waitingIn(pair)));

      const stagger = change === "fold" ? STAGGER.fold : STAGGER.other;
      const next = new Map<string, Flight<ShownMark>>();
      pairs.forEach((pair, index) => {
        const { name, from, to } = pair;
        const role = isPart(pair) ? springRoles.move : springRoles.flight;
        const running = flights.get(name);
        const reverses =
          running !== undefined &&
          running.origin.element === to.element &&
          running.destination.element === from.element;
        const start = reverses
          ? {
              value: 1 - running.progress.get(),
              velocity: -running.progress.getVelocity(),
            }
          : undefined;
        running?.drop();
        flights.delete(name);
        next.set(
          name,
          fly({
            origin: from,
            destination: reverses ? { ...to, rect: running.origin.rect } : to,
            delay: reverses ? 0 : index * stagger,
            role,
            under: underOf(from, to),
            start,
          }),
        );
      });
      for (const flight of flights.values()) flight.drop();
      flights = next;
    };
    return { start, moved, flying };
  }

  return {
    capture() {
      const showing = shownMarks();
      const layout = captureLayout(
        showing.map(({ element }) => element),
        view,
      );
      const captured = new Map<string, ShownMark>();
      for (const { name, element, options } of showing) {
        const flight = flights.get(name);
        const rect =
          flight !== undefined && flight.destination.element === element
            ? flight.rect()
            : layout.rectOf(element);
        if (rect !== undefined) {
          captured.set(name, markOf(element, rect, options));
        }
      }
      const { left, top } = view.getBoundingClientRect();
      return { marks: captured, origin: { x: left, y: top } };
    },

    plan,

    tick() {
      landParts();
      for (const flight of flights.values()) flight.refresh();
    },

    dropResting() {
      flights = new Map(
        [...flights].filter(([, flight]) => keepMoving(flight)),
      );
      holders = holders.filter(keepMoving);
    },

    dropAll() {
      for (const part of [...flights.values(), ...holders]) {
        part.drop();
      }
      flights = new Map();
      holders = [];
    },
  };
}
