import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../motion/create-motion-value.ts";
import { mix, unit } from "../motion/mix.ts";
import { MIN_MOVE } from "../motion/play-layout.ts";
import { px } from "../motion/px.ts";
import { springOf, springRoles, type Spring } from "../motion/spring-roles.ts";

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
/** The scale a marker grows in from, where it has no row to come from. */
const GROW_FROM = 0.92;
/** The scale of the hover fill while a press holds it. */
const PRESSED_SCALE = 0.97;
/** A fill this faint or fainter has no place to glide from. */
const FADED = 0.05;

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

/** The box of `element` against the box of `origin`. */
function boxIn(element: Element, origin: DOMRect): Box {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left - origin.left, y: top - origin.top, width, height };
}

/**
 * Whether half of `box`, against `origin`, shows inside every box that
 * clips `from` and inside the viewport.
 */
function isSeen(from: Element, origin: DOMRect, box: Box) {
  let top = origin.top + box.y;
  let bottom = top + box.height;
  for (
    let node = from.parentElement;
    node !== null;
    node = node.parentElement
  ) {
    if (getComputedStyle(node).overflowY === "visible") continue;
    const clip = node.getBoundingClientRect();
    top = Math.max(top, clip.top);
    bottom = Math.min(bottom, clip.bottom);
  }
  top = Math.max(top, 0);
  bottom = Math.min(bottom, window.innerHeight);
  return bottom - top >= box.height / 2;
}

/** A fill that springs from row to row: the current-page marker or the hover fill. */
interface Fill {
  readonly element: HTMLElement;
  readonly box: readonly [MotionValue, MotionValue, MotionValue, MotionValue];
  readonly shown: MotionValue;
  readonly pressed: MotionValue;
  readonly binding: Binding;
  readonly spring: Spring;
}

function createFill(
  engine: MotionEngine,
  element: HTMLElement,
  spring: Spring,
): Fill {
  const length = () =>
    createMotionValue(engine, 0, { spring, precision: MIN_MOVE });
  const box = [length(), length(), length(), length()] as const;
  const shown = createMotionValue(engine, 0, { spring });
  const pressed = createMotionValue(engine, 0, { spring });
  const binding = bind(element, [...box, shown, pressed], {
    pose: (x, y, width, height, at, press) => ({
      translate: `${px(x)} ${px(y)}`,
      width: px(Math.max(0, width)),
      height: px(Math.max(0, height)),
      opacity: unit(at).toFixed(3),
      scale: (
        mix(GROW_FROM, 1, unit(at)) * mix(1, PRESSED_SCALE, press)
      ).toFixed(4),
    }),
  });
  return { element, box, shown, pressed, binding, spring };
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

function boxOf(fill: Fill): Box {
  const [x, y, width, height] = fill.box.map((value) => value.get());
  return { x, y, width, height };
}

/**
 * The motion of a `NavList`: the current-page marker that springs from row
 * to row, and the hover fill that glides under a fine pointer. Each is one
 * element in `box`, under the rows.
 *
 * @internal
 */
export interface NavListMotion {
  /**
   * Starts the motion on the elements, and puts the marker on its row at
   * once. `list` holds the rows, and `box` holds the list and the fills.
   * `onMarkerMove` gets each new row of the marker, and whether the marker
   * springs there because the current page changed. Else it grows in there,
   * or a group opened or closed.
   */
  attach(parts: {
    box: HTMLElement;
    list: HTMLElement;
    marker: HTMLElement;
    hover: HTMLElement;
    onMarkerMove?: (row: Element, isNavigation: boolean) => void;
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
    hover: Fill;
    canHover: MediaQueryList;
    onMarkerMove: (row: Element, isNavigation: boolean) => void;
  } | null = null;
  let markerRow: Element | null = null;
  let currentPage: Element | null = null;
  let hoverRow: Element | null = null;
  let isQueued = false;
  const rowOf = (target: EventTarget) =>
    target instanceof Element && parts !== null
      ? target.closest(`[${NAV_ROW}]`)
      : null;

  function update(isFirst: boolean) {
    if (parts === null) return;
    const { box, marker, hover, onMarkerMove } = parts;
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
      marker.shown.to(0);
      return;
    }
    const target = markerTargetOf(current);
    markerRow = target;
    const to = boxIn(target, origin);
    if (isFirst) {
      placeAt(marker, to);
      marker.shown.set(1);
      onMarkerMove(target, false);
      return;
    }
    if (target === was) {
      follow(marker, to);
    } else if (
      marker.shown.target === 1 &&
      marker.shown.get() > FADED &&
      isSeen(box, origin, boxOf(marker))
    ) {
      springTo(marker, to);
      onMarkerMove(target, current !== wasPage);
    } else {
      placeAt(marker, to);
      marker.shown.set(0);
      marker.shown.to(1);
      onMarkerMove(target, false);
    }
  }

  return {
    attach({
      box,
      list,
      marker: markerElement,
      hover: hoverElement,
      onMarkerMove = () => {},
    }) {
      const marker = createFill(engine, markerElement, MARKER_SPRING);
      const hover = createFill(engine, hoverElement, HOVER_SPRING);
      parts = {
        box,
        marker,
        hover,
        canHover: window.matchMedia("(hover: hover) and (pointer: fine)"),
        onMarkerMove,
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
        marker.binding.unbind();
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
      hoverRow = row;
      if (row === null) {
        hover.shown.to(0);
        return;
      }
      const to = boxIn(row, box.getBoundingClientRect());
      if (hover.shown.get() <= FADED) {
        placeAt(hover, to);
        hover.shown.set(0);
      } else {
        springTo(hover, to);
      }
      hover.shown.to(1);
      return;
    },
    hoverOut() {
      if (parts === null) return;
      hoverRow = null;
      parts.hover.shown.to(0);
      parts.hover.pressed.to(0);
      parts.hover.element.removeAttribute(NAV_PRESSED);
    },
    press(target, isDown) {
      if (parts === null) return;
      const { hover } = parts;
      const isOnHover = isDown && rowOf(target) === hoverRow;
      if (isDown && !isOnHover) return;
      hover.pressed.to(isDown ? 1 : 0);
      hover.element.toggleAttribute(NAV_PRESSED, isDown);
    },
  };
}
