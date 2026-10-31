import { EXTRACTOR_FAN_FALLOFF } from "../effect-layer/dust-element-value.ts";
import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../motion/create-motion-value.ts";
import { cssTween } from "../motion/css-tween.ts";
import { mix, unit } from "../motion/mix.ts";
import { MIN_MOVE } from "../motion/play-layout.ts";
import { px } from "../motion/px.ts";
import { springOf, springRoles, type Spring } from "../motion/spring-roles.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";

/**
 * The attribute of each row that the hover fill can rest on: a link, or the
 * button of a group in a group.
 *
 * @internal
 */
export const NAV_ROW = "data-nav-row";

/**
 * The attribute of the hover fill while a press holds it.
 *
 * @internal
 */
export const NAV_PRESSED = "data-pressed";

const CURRENT = "[aria-current=page]";
const MARKER_SPRING = springOf(springRoles.move);
const HOVER_SPRING = springOf(springRoles.surface);
/** The scale a fill grows in from, where it has no row to come from. */
const GROW_FROM = 0.92;
/** The scale of the hover fill while a press holds it. */
const PRESSED_SCALE = 0.97;
/** A fill this faint or fainter has no place to glide from. */
const FADED = 0.05;
/**
 * How fast the old marker fades out where it sheds its dust, and the scale
 * it shrinks to as it loses the dust.
 */
const SHED_FADE = cssTween(duration._200, easing.easeOut);
const SHED_SCALE = 0.95;
/**
 * The new marker forms from the dust: it starts `FORM_LEAD` seconds before
 * the bulk of the dust lands, at `FORM_FROM` scale, and springs out at
 * `FORM_KICK` scale per second, so it overshoots a little as the dust
 * lands.
 */
const FORM_LEAD = 0.06;
const FORM_FROM = 0.94;
const FORM_KICK = 1.2;
/**
 * When the bulk of the dust lands, in seconds after the shed: `LAND_AFTER`,
 * and `1 / LAND_SPEED` more for each px from the old row to the new row.
 */
const LAND_AFTER = 0.25;
const LAND_SPEED = 1900;
/** How long the new marker pulls the dust in after the last shed, in s. */
const PULL_SECONDS = 1.2;
/** How far past the old row the dust of a burst flies before it turns, in px. */
const FLIGHT = 160;

/**
 * The row that shows the current page: the current link, or the row of the
 * closed group that holds it.
 *
 * @internal
 */
export function markerTargetOf(current: Element): Element {
  let target = current;
  for (
    let rows = current.closest("ul[id]");
    rows !== null;
    rows = rows.parentElement?.closest("ul[id]") ?? null
  ) {
    const toggle = rows.previousElementSibling;
    if (toggle?.getAttribute("aria-expanded") === "false") target = toggle;
  }
  return target;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** How far the farthest point of `from` is outside the box `to`. */
function farGap(from: Box, to: Box) {
  return Math.hypot(
    Math.max(0, to.x - from.x, from.x + from.width - to.x - to.width),
    Math.max(0, to.y - from.y, from.y + from.height - to.y - to.height),
  );
}

/** The box of `element` against the box of `origin`. */
function boxIn(element: Element, origin: DOMRect): Box {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left - origin.left, y: top - origin.top, width, height };
}

/**
 * Whether half of `box`, against `origin`, shows inside every box that
 * clips `from` and inside the viewport. The scroll padding of a scroller
 * keeps its content clear of the chrome that sticks over its edges, so a
 * row under that chrome does not show.
 */
function isSeen(from: Element, origin: DOMRect, box: Box) {
  let top = origin.top + box.y;
  let bottom = top + box.height;
  for (
    let node = from.parentElement;
    node !== null;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    if (style.overflowY === "visible") continue;
    const clip = node.getBoundingClientRect();
    top = Math.max(
      top,
      clip.top + (Number.parseFloat(style.scrollPaddingTop) || 0),
    );
    bottom = Math.min(
      bottom,
      clip.bottom - (Number.parseFloat(style.scrollPaddingBottom) || 0),
    );
  }
  top = Math.max(top, 0);
  bottom = Math.min(bottom, window.innerHeight);
  return bottom - top >= box.height / 2;
}

/**
 * A fill that springs from row to row: the current-page marker, the old
 * marker that sheds dust, or the hover fill.
 */
interface Fill {
  readonly element: HTMLElement;
  readonly box: readonly [MotionValue, MotionValue, MotionValue, MotionValue];
  readonly shown: MotionValue;
  readonly size: MotionValue;
  readonly pressed: MotionValue;
  readonly binding: Binding;
  readonly spring: Spring;
}

/**
 * The fill hides through a filter, not through `opacity`. The effect layer
 * measures no element at `opacity: 0`, and a fill that sheds dust or pulls
 * it in must stay measured.
 */
function createFill(
  engine: MotionEngine,
  element: HTMLElement,
  spring: Spring,
): Fill {
  const length = () =>
    createMotionValue(engine, 0, { spring, precision: MIN_MOVE });
  const box = [length(), length(), length(), length()] as const;
  const shown = createMotionValue(engine, 0, { spring });
  const size = createMotionValue(engine, GROW_FROM, { spring });
  const pressed = createMotionValue(engine, 0, { spring });
  const binding = bind(element, [...box, shown, size, pressed], {
    pose: (x, y, width, height, at, scale, press) => ({
      translate: `${px(x)} ${px(y)}`,
      width: px(Math.max(0, width)),
      height: px(Math.max(0, height)),
      filter: `opacity(${unit(at).toFixed(3)})`,
      scale: (scale * mix(1, PRESSED_SCALE, press)).toFixed(4),
    }),
  });
  return { element, box, shown, size, pressed, binding, spring };
}

/** Puts a fill at `at` shown, at once. It is smaller while it is faint. */
function setShown(fill: Fill, at: number) {
  fill.shown.set(at);
  fill.size.set(mix(GROW_FROM, 1, at));
}

/** Shows a fill, or hides it, and grows it or shrinks it with the fade. */
function showTo(fill: Fill, isShown: boolean) {
  fill.shown.to(isShown ? 1 : 0);
  fill.size.to(isShown ? 1 : GROW_FROM);
}

function placeAt(fill: Fill, box: Box) {
  const [x, y, width, height] = fill.box;
  x.set(box.x);
  y.set(box.y);
  width.set(box.width);
  height.set(box.height);
}

function springTo(fill: Fill, box: Box) {
  const [x, y, width, height] = fill.box;
  const { spring } = fill;
  x.to(box.x, { spring });
  y.to(box.y, { spring });
  width.to(box.width, { spring });
  height.to(box.height, { spring });
}

/** Keeps a fill on its row while the layout moves the row. */
function follow(fill: Fill, box: Box) {
  const values = fill.box;
  const targets = [box.x, box.y, box.width, box.height];
  if (values.some((value) => value.isMoving)) {
    if (
      values.some(
        (value, index) => Math.abs(value.target - targets[index]) >= MIN_MOVE,
      )
    ) {
      springTo(fill, box);
    }
    return;
  }
  placeAt(fill, box);
}

/** Puts `into` where `out` is, at its speed, and sends it to `target`. */
function carry(out: MotionValue, into: MotionValue, target: number) {
  into.set(out.get(), { velocity: out.getVelocity() });
  into.to(target);
}

/** Lets go of a press on the hover fill and on the marker. */
function release({ hover, marker }: { hover: Fill; marker: Fill }) {
  for (const fill of [hover, marker]) {
    fill.pressed.to(0);
    fill.element.removeAttribute(NAV_PRESSED);
  }
}

function boxOf(fill: Fill): Box {
  const [x, y, width, height] = fill.box.map((value) => value.get());
  return { x, y, width, height };
}

/**
 * The motion of a `NavList`: the current-page marker, the old marker that
 * sheds dust when the current page changes, and the hover fill that glides
 * under a fine pointer. Each is one element in `box`, under the rows. The
 * three look the same, so the hover fill hides on the marker's row, and the
 * marker takes the place of the hover fill on the row that becomes current.
 *
 * @internal
 */
export interface NavListMotion {
  /**
   * Starts the motion on the elements, and puts the marker on its row at
   * once. `list` holds the rows, and `box` holds the list and the fills.
   * `onPull` gets how far the new marker must pull dust in while it forms:
   * with `shake` when the old marker must shed dust too, and with 0 when
   * the pull ends. `canShed` tells whether the effect layer draws the dust
   * of `shed` now. Else the marker springs from the old row to the new one.
   */
  attach(parts: {
    box: HTMLElement;
    list: HTMLElement;
    marker: HTMLElement;
    shed: HTMLElement;
    hover: HTMLElement;
    onPull: (reach: number, shake: boolean) => void;
    canShed: () => boolean;
  }): () => void;
  /** Moves the marker to the row of the current page, after the commit. */
  refresh(): void;
  /** The pointer came over `target`. */
  hoverOver(target: EventTarget, pointerType: string): void;
  /** The pointer left the list. */
  hoverOut(): void;
  /** A press started or ended on `target`. */
  press(target: EventTarget, isDown: boolean): void;
}

/** @internal */
export function createNavListMotion(engine: MotionEngine): NavListMotion {
  let parts: {
    box: HTMLElement;
    marker: Fill;
    shed: Fill;
    hover: Fill;
    canHover: MediaQueryList;
    onPull: (reach: number, shake: boolean) => void;
    canShed: () => boolean;
  } | null = null;
  let markerRow: Element | null = null;
  let currentPage: Element | null = null;
  let hoverRow: Element | null = null;
  let isQueued = false;
  /** The rows that shed dust that is still on its way, while the pull lasts. */
  let sources: Box[] = [];
  let cancelPullEnd: (() => void) | null = null;
  const rowOf = (target: EventTarget) =>
    target instanceof Element && parts !== null
      ? target.closest(`[${NAV_ROW}]`)
      : null;

  function endPull() {
    cancelPullEnd?.();
    cancelPullEnd = null;
    sources = [];
  }

  /**
   * Fades the old marker out at `from`, and shrinks it as it sheds its
   * dust. It stays measured by the effect layer until the burst has shed.
   */
  function shedAt(from: Box) {
    if (parts === null) return;
    const { marker, shed } = parts;
    placeAt(shed, from);
    shed.shown.set(unit(marker.shown.get()));
    shed.size.set(marker.size.get());
    shed.shown.to(0, { tween: SHED_FADE });
    shed.size.to(SHED_SCALE, { tween: SHED_FADE });
  }

  /**
   * Puts the marker where the hover fill is, as it is, and springs it to
   * `to`. The hover fill hides at once. They look the same, so nothing
   * changes on the screen.
   */
  function takeHover(to: Box) {
    if (parts === null) return;
    const { marker, hover } = parts;
    placeAt(marker, boxOf(hover));
    springTo(marker, to);
    carry(hover.shown, marker.shown, 1);
    carry(hover.size, marker.size, 1);
    carry(hover.pressed, marker.pressed, hover.pressed.target);
    marker.element.toggleAttribute(
      NAV_PRESSED,
      hover.element.hasAttribute(NAV_PRESSED),
    );
    hover.element.removeAttribute(NAV_PRESSED);
    setShown(hover, 0);
    hover.pressed.set(0);
  }

  /**
   * Pulls the dust of every row that shed it into the marker at `to`, and
   * with `from` sheds dust off the old marker there first. With `isFormed`
   * the marker already shows at `to`, and takes the dust in. Else it is
   * empty until the first dust can reach it, then forms from the dust and
   * settles when the bulk of the dust lands.
   */
  function pull(to: Box, from: Box | null, isFormed: boolean) {
    if (parts === null) return;
    const { marker, onPull } = parts;
    if (from !== null) {
      shedAt(from);
      sources.push(from);
    }
    const gap = Math.max(...sources.map((source) => farGap(source, to)));
    if (!isFormed) {
      const delay = Math.max(0, LAND_AFTER + gap / LAND_SPEED - FORM_LEAD);
      placeAt(marker, to);
      marker.shown.set(0);
      marker.size.set(FORM_FROM, { velocity: FORM_KICK });
      marker.shown.to(1, { delay });
      marker.size.to(1, { delay });
    }
    onPull((gap + FLIGHT) / EXTRACTOR_FAN_FALLOFF, from !== null);
    cancelPullEnd?.();
    cancelPullEnd = engine.loop.at(engine.loop.now() + PULL_SECONDS, () => {
      endPull();
      parts?.onPull(0, false);
    });
  }

  function update(isFirst: boolean) {
    if (parts === null) return;
    const { box, marker, shed, hover, canShed } = parts;
    const origin = box.getBoundingClientRect();
    if (hoverRow !== null && hoverRow.isConnected) {
      follow(hover, boxIn(hoverRow, origin));
    }
    const current = box.querySelector(CURRENT);
    const was = markerRow;
    const wasPage = currentPage;
    currentPage = current;
    if (current === null) {
      markerRow = null;
      showTo(marker, false);
      return;
    }
    const target = markerTargetOf(current);
    markerRow = target;
    const to = boxIn(target, origin);
    if (isFirst) {
      placeAt(marker, to);
      placeAt(shed, to);
      setShown(marker, 1);
      return;
    }
    if (target === was) {
      follow(marker, to);
      return;
    }
    const from = boxOf(marker);
    const isPulling = sources.length > 0;
    const isSolid = marker.shown.target === 1 && marker.shown.get() > FADED;
    const isOldSeen = isSolid && isSeen(box, origin, from);
    if (isOldSeen && current === wasPage) {
      springTo(marker, to);
      return;
    }
    const isHovered = hoverRow === target && hover.shown.get() > FADED;
    if (
      !engine.reducedMotion &&
      (isOldSeen || isPulling) &&
      isSeen(box, origin, to) &&
      canShed()
    ) {
      if (isHovered) takeHover(to);
      pull(to, isOldSeen ? from : null, isHovered);
      return;
    }
    if (isOldSeen) {
      springTo(marker, to);
      showTo(marker, true);
      if (isHovered) showTo(hover, false);
      return;
    }
    placeAt(shed, to);
    setShown(shed, 0);
    if (isHovered) {
      takeHover(to);
      return;
    }
    placeAt(marker, to);
    setShown(marker, 0);
    showTo(marker, true);
  }

  return {
    attach({
      box,
      list,
      marker: markerElement,
      shed: shedElement,
      hover: hoverElement,
      onPull,
      canShed,
    }) {
      const marker = createFill(engine, markerElement, MARKER_SPRING);
      const shed = createFill(engine, shedElement, MARKER_SPRING);
      const hover = createFill(engine, hoverElement, HOVER_SPRING);
      parts = {
        box,
        marker,
        shed,
        hover,
        canHover: window.matchMedia("(hover: hover) and (pointer: fine)"),
        onPull,
        canShed,
      };
      update(true);
      // The rows move when a group opens or closes, when the fonts load and
      // when the list changes width. Each of these changes the size of the
      // list. The observer runs after the layout and before the paint, so
      // the fills stay on their rows in the same frame.
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              update(false);
            });
      observer?.observe(list);
      return () => {
        observer?.disconnect();
        endPull();
        marker.binding.unbind();
        shed.binding.unbind();
        hover.binding.unbind();
        parts = null;
        markerRow = null;
        currentPage = null;
        hoverRow = null;
      };
    },
    refresh() {
      if (isQueued) return;
      isQueued = true;
      queueMicrotask(() => {
        isQueued = false;
        update(false);
      });
    },
    hoverOver(target, pointerType) {
      if (parts === null) return;
      const { box, hover, canHover } = parts;
      if (pointerType !== "mouse" || !canHover.matches) return;
      const row = rowOf(target);
      if (row === hoverRow) return;
      const wasOnMarker = hoverRow !== null && hoverRow === markerRow;
      hoverRow = row;
      if (row === null || row === markerRow) {
        showTo(hover, false);
        return;
      }
      const to = boxIn(row, box.getBoundingClientRect());
      // From the marker's row, the fill grows in at the new row. A fill
      // that glides out of the marker looks like the marker comes off.
      if (wasOnMarker || hover.shown.get() <= FADED) {
        placeAt(hover, to);
        setShown(hover, 0);
      } else {
        springTo(hover, to);
      }
      showTo(hover, true);
      return;
    },
    hoverOut() {
      if (parts === null) return;
      hoverRow = null;
      showTo(parts.hover, false);
      release(parts);
    },
    press(target, isDown) {
      if (parts === null) return;
      if (!isDown) {
        release(parts);
        return;
      }
      if (rowOf(target) !== hoverRow) return;
      const fill = hoverRow === markerRow ? parts.marker : parts.hover;
      fill.pressed.to(1);
      fill.element.setAttribute(NAV_PRESSED, "");
    },
  };
}
