import type { FrameLoop } from "../motion/create-frame-loop.ts";
import {
  FOCUS_RING_MARGIN,
  MAX_BEND,
  paintStones,
  surfaceOf,
  type StoneFrame,
} from "./paint-stones.ts";
import { pondRuns, type PondView } from "./pond-runs.ts";
import {
  POND,
  STONE_SLOTS,
  calmWithin,
  pondEnd,
  slopeProfile,
} from "./pond.ts";

const STEP = 1 / 60;
/** How many frames ahead the maps are made, so that each has loaded when it shows. */
const LOOKAHEAD = 4;
const MAPS_PER_TICK = 2;
const DENSEST = 2;

const SVG = "http://www.w3.org/2000/svg";

let sharedDefs: SVGSVGElement | null = null;

function pondDefs() {
  if (sharedDefs?.isConnected !== true) {
    sharedDefs = document.createElementNS(SVG, "svg");
    sharedDefs.setAttribute("aria-hidden", "true");
    sharedDefs.setAttribute("width", "0");
    sharedDefs.setAttribute("height", "0");
    sharedDefs.style.cssText =
      "position:absolute;inline-size:0;block-size:0;overflow:hidden;pointer-events:none";
    document.body.append(sharedDefs);
  }
  return sharedDefs;
}

let nextFrame = 0;

/** A stone dropped in a pond. */
interface Stone {
  readonly x: number;
  readonly y: number;
  /** When its first ring starts, on the clock of the loop. */
  readonly start: number;
  /** How long its rings run, in seconds from `start`. */
  end: number;
  /** Whether a newer stone makes it calm early. */
  calming: boolean;
}

interface RingFrame {
  readonly url: string;
  readonly view: PondView;
  readonly filter: SVGFilterElement;
  readonly href: string;
  ready: boolean;
}

/** The rings that run in one element. */
interface Pond {
  /** Drops `stone` in the pond, with the rings that run already. */
  add(stone: Stone): void;
  /** Stops the rings and takes the filter off. */
  stop(): void;
}

const ponds = new WeakMap<HTMLElement, Pond>();

/**
 * Drops a stone at (`x`, `y`) in `element`, in its own px, whose rings
 * start on `loop` after `delay` seconds. `box` is the element's bounding
 * client rect. The rings of each stone add to the rings that run already,
 * as on water. The water bends the element's own content through an SVG
 * filter, one for each frame of the rings, and `pondRuns` tells the effect
 * layer which frame shows, so that it lights the same water.
 *
 * @internal
 */
export function dropStone({
  element,
  box,
  loop,
  x,
  y,
  delay,
}: {
  element: HTMLElement;
  box: DOMRect;
  loop: FrameLoop;
  x: number;
  y: number;
  delay: number;
}) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (width === 0 || height === 0) return;
  const stone: Stone = {
    x,
    y,
    start: loop.now() + delay,
    end: pondEnd(x, y, width, height),
    calming: false,
  };
  const running = ponds.get(element);
  if (running === undefined) {
    ponds.set(element, startPond(element, box, loop, stone));
  } else {
    running.add(stone);
  }
}

/**
 * Stops the rings in `element`, if any run, and takes the filter off.
 *
 * @internal
 */
export function calmPond(element: HTMLElement) {
  ponds.get(element)?.stop();
}

function startPond(
  element: HTMLElement,
  box: DOMRect,
  loop: FrameLoop,
  first: Stone,
): Pond {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const density = Math.min(
    DENSEST,
    Math.max(1, Math.round((window.devicePixelRatio * box.width) / width)),
  );
  const surface = surfaceOf(element, width, height, density);
  const defs = pondDefs();
  const stones: Stone[] = [first];
  const origin = first.start;
  const frames = new Map<number, RingFrame>();
  const ownContain = element.style.getPropertyValue("contain");
  let last = 0;
  let made = -1;
  let shown = -1;
  let kept = 0;
  let stopped = false;
  let frameKey: CSSNumberish | null = Number.NaN;
  let view: PondView | null = null;

  /** The time on the clock of the loop at which frame `index` shows. */
  const timeOf = (index: number) => origin + index * STEP;

  function measure() {
    const calmAt = Math.max(...stones.map((each) => each.start + each.end));
    last = Math.ceil((calmAt - origin) / STEP);
  }
  measure();

  function release(index: number) {
    const frame = frames.get(index);
    if (frame === undefined) return;
    frames.delete(index);
    frame.filter.remove();
    URL.revokeObjectURL(frame.href);
  }

  // A filter shows a new map only after the map loads, and WebKit does not
  // then draw the element again. Thus each frame of the rings has its own
  // filter, which this makes some frames before the element uses it.
  function make(index: number) {
    made = index;
    const now = timeOf(index);
    const shownStones: StoneFrame[] = [];
    for (const each of stones) {
      const time = now - each.start;
      if (time <= 0 || time >= each.end) continue;
      shownStones.push({
        x: each.x,
        y: each.y,
        profile: slopeProfile(time, each.end),
        calm: Math.max(0, calmWithin(time) - 2),
      });
    }
    paintStones(surface, shownStones);
    const href = URL.createObjectURL(
      new Blob([surface.bmp], { type: "image/bmp" }),
    );
    const id = `pond-${String(nextFrame++)}`;
    const filter = document.createElementNS(SVG, "filter");
    filter.id = id;
    // WebKit drops an HTML element whose filter region is in user space, so
    // the region is a share of the element. The map fills the region.
    filter.setAttribute("x", String(-FOCUS_RING_MARGIN / width));
    filter.setAttribute("y", String(-FOCUS_RING_MARGIN / height));
    filter.setAttribute("width", String(surface.columns / density / width));
    filter.setAttribute("height", String(surface.rows / density / height));
    filter.setAttribute("color-interpolation-filters", "sRGB");
    const map = document.createElementNS(SVG, "feImage");
    map.setAttribute("href", href);
    map.setAttribute("preserveAspectRatio", "none");
    map.setAttribute("result", "map");
    const bend = document.createElementNS(SVG, "feDisplacementMap");
    bend.setAttribute("in", "SourceGraphic");
    bend.setAttribute("in2", "map");
    bend.setAttribute("scale", String(2 * MAX_BEND));
    bend.setAttribute("xChannelSelector", "R");
    bend.setAttribute("yChannelSelector", "G");
    filter.append(map, bend);
    defs.append(filter);
    const frame: RingFrame = {
      url: `url(#${id})`,
      view: {
        width,
        height,
        stones: shownStones.map(({ x, y, profile }) => ({ x, y, profile })),
      },
      filter,
      href,
      ready: false,
    };
    frames.set(index, frame);
    const decoded = new Image();
    decoded.src = href;
    const markReady = () => {
      frame.ready = true;
    };
    decoded.decode().then(markReady, markReady);
  }

  make(0);

  function show() {
    if (stopped) return null;
    const key = document.timeline.currentTime;
    if (key !== null && key === frameKey) return view;
    frameKey = key;
    const due = Math.min(Math.floor((loop.now() - origin) / STEP), last);
    for (let at = due; at > shown; at--) {
      const frame = frames.get(at);
      if (frame?.ready !== true) continue;
      if (shown < 0) {
        // WebKit can show nothing of an element with an SVG filter and a
        // positioned box in it, such as the touch target of a button. Paint
        // containment prevents this.
        element.style.setProperty("contain", "paint");
      }
      element.style.filter = frame.url;
      // When the layers change, WebKit can draw the element again from a
      // filter that it showed before. Thus the two frames before stay.
      for (; kept < at - 2; kept++) release(kept);
      shown = at;
      view = frame.view;
      break;
    }
    return view;
  }

  pondRuns.set(element, show);
  const stopTicks = loop.every((now) => {
    const time = now - origin;
    if (time >= last * STEP) {
      stop();
      return;
    }
    const due = Math.max(0, Math.floor(time / STEP));
    const ahead = Math.min(last, due + LOOKAHEAD);
    for (let count = 0; count < MAPS_PER_TICK && made < ahead; count++) {
      make(Math.max(made + 1, due));
    }
    show();
  });

  function stop() {
    if (stopped) return;
    stopped = true;
    stopTicks();
    pondRuns.delete(element);
    ponds.delete(element);
    element.style.removeProperty("filter");
    if (ownContain === "") element.style.removeProperty("contain");
    else element.style.setProperty("contain", ownContain);
    for (const index of [...frames.keys()]) release(index);
    if (defs.childElementCount === 0) defs.remove();
  }

  return {
    add(stone) {
      if (stopped) return;
      const now = loop.now();
      stones.splice(
        0,
        stones.length,
        ...stones.filter((each) => each.start + each.end > now),
      );
      const running = stones.filter((each) => !each.calming);
      let changesFrom = stone.start;
      if (running.length >= POND.stones) {
        const oldest = running[0];
        oldest.calming = true;
        oldest.end = Math.min(
          oldest.end,
          Math.max(0, now - oldest.start) + POND.lastFade,
        );
        changesFrom = now;
      }
      stones.push(stone);
      while (stones.length > STONE_SLOTS) stones.shift();
      measure();
      // The frames made ahead do not have the new stone yet.
      for (const index of [...frames.keys()]) {
        if (index > shown && timeOf(index) > changesFrom) release(index);
      }
      made = Math.min(
        made,
        Math.max(shown, Math.floor((changesFrom - origin) / STEP)),
      );
    },
    stop,
  };
}
