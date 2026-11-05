import { EXTRACTOR_FAN_FALLOFF } from "../effect-layer/dust-element-value.ts";
import {
  boxIn,
  CAN_HOVER_QUERY,
  createFill,
  FADED,
  follow,
  glideTo,
  HOVER_SPRING,
  placeAt,
  setShown,
  showTo,
  springTo,
  type Box,
  type Fill,
} from "../motion/create-fill.ts";
import { FLOW_SPRING, type RestRate } from "../motion/create-flow-motion.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import type { MotionValue } from "../motion/create-motion-value.ts";
import { px, writeStyles } from "../motion/px.ts";

/**
 * The attribute of each row that the hover fill can rest on: a link, or the
 * button of a group in a group.
 *
 * @internal
 */
export const NAV_ROW = "data-nav-row";

/**
 * The attribute of the icon of a row, which sheds the dust of a change of
 * page and pulls it in.
 *
 * @internal
 */
export const NAV_ICON = "data-nav-icon";

/**
 * The attribute of the hover fill while a press holds it.
 *
 * @internal
 */
export const NAV_PRESSED = "data-pressed";

/**
 * The attribute of the marker of the current page, so that a test can find it.
 *
 * @internal
 */
export const NAV_MARKER = "data-nav-marker";

const CURRENT = "[aria-current=page]";
/** How long the new icon pulls the dust in after the last shed, in s. */
const PULL_SECONDS = 1;
/** How far past the old icon the dust of a burst flies before it turns, in px. */
const FLIGHT = 40;
/**
 * How fast the new icon pulls the dust in, as `useExtractorFan` takes it: at
 * least `PULL_STRENGTH`, and more from `PULL_FAR` px away. A spring takes the
 * same time for any distance, so a pull that grows with the distance lands
 * the dust as the marker settles.
 */
const PULL_STRENGTH = 1.5;
const PULL_FAR = 150;

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
    const toggle = rows.parentElement?.previousElementSibling;
    if (toggle?.getAttribute("aria-expanded") === "false") target = toggle;
  }
  return target;
}

/** How far the farthest point of `from` is outside the box `to`. */
function farGap(from: Box, to: Box) {
  return Math.hypot(
    Math.max(0, to.x - from.x, from.x + from.width - to.x - to.width),
    Math.max(0, to.y - from.y, from.y + from.height - to.y - to.height),
  );
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

/** The box of the icon of `row` under `holder`, or `null` where none shows. */
function iconBoxOf(holder: HTMLElement, row: Element | null): Box | null {
  const icon = row?.querySelector(`[${NAV_ICON}]`);
  if (icon == null) return null;
  const box = boxIn(holder, icon);
  return box.width > 0 ? box : null;
}

function placeOn(element: HTMLElement, { x, y, width, height }: Box) {
  writeStyles(element, {
    translate: `${px(x)} ${px(y)}`,
    width: px(width),
    height: px(height),
  });
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
 * The motion of a `NavList`: the current-page marker and the hover fill that
 * glides under a fine pointer, each one element in `box`, under the rows, and
 * the wisp of dust that goes from the icon of the old row to the icon of the
 * new row when the current page changes. The two fills look the same, so the
 * hover fill hides on the marker's row, and where the marker has no row to
 * come from, it takes the place of the hover fill.
 *
 * @internal
 */
export interface NavListMotion {
  /**
   * Starts the motion on the elements, and puts the marker on its row at
   * once. `list` holds the rows, and `box` holds the list and the fills.
   * `shed` and `fan` are hidden elements that go on the old icon and on the
   * new icon, for the effect layer to measure. `onPull` gets how far `fan`
   * must pull dust in and how fast: with `shake` when `shed` must shed dust
   * too, and with a reach of 0 when the pull ends. `canShed` tells whether the
   * effect layer draws the dust of `shed` now. Else the marker moves with no
   * dust.
   */
  attach(parts: {
    box: HTMLElement;
    list: HTMLElement;
    marker: HTMLElement;
    hover: HTMLElement;
    shed: HTMLElement;
    fan: HTMLElement;
    onPull: (reach: number, strength: number, shake: boolean) => void;
    canShed: () => boolean;
  }): () => void;
  /** Moves the marker to the row of the current page, after the commit. */
  refresh(): void;
  /**
   * A group moves the rows under the key `group`, until `endMove`. The fills go
   * to their rows on the spring of the rows. `readTarget` runs a read in the
   * layout that the rows go to, and `restRate` tells how a row goes there.
   */
  moveWithRows(
    group: string,
    readTarget: ReadTarget,
    restRate: RestRateOf,
  ): void;
  endMove(group: string): void;
  /** The pointer came over `target`. */
  hoverOver(target: EventTarget, pointerType: string): void;
  /** The pointer left the list. */
  hoverOut(): void;
  /** A press started or ended on `target`. */
  press(target: EventTarget, isDown: boolean): void;
}

type ReadTarget = <T>(read: () => T) => T;

type RestRateOf = (row: Element) => RestRate;

/** @internal */
export function createNavListMotion(engine: MotionEngine): NavListMotion {
  let parts: {
    box: HTMLElement;
    marker: Fill;
    hover: Fill;
    shed: HTMLElement;
    fan: HTMLElement;
    canHover: MediaQueryList;
    onPull: (reach: number, strength: number, shake: boolean) => void;
    canShed: () => boolean;
  } | null = null;
  let markerRow: Element | null = null;
  let currentPage: Element | null = null;
  let hoverRow: Element | null = null;
  let isQueued = false;
  /** The groups that move the rows. While one does, a layout does not move a fill. */
  const movingGroups = new Map<
    string,
    { readTarget: ReadTarget; restRate: RestRateOf }
  >();
  /** The icons that shed dust that is still on its way, while the pull lasts. */
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
   * Sheds a burst from the icon of `fromRow`, and pulls it into the icon of
   * `toRow`, with the dust that is still on its way from other icons.
   */
  function passDust(fromRow: Element | null, toRow: Element, origin: DOMRect) {
    if (parts === null || engine.reducedMotion || !parts.canShed()) return;
    const { box, shed, fan, onPull } = parts;
    const to = iconBoxOf(box, toRow);
    if (to === null || !isSeen(box, origin, to)) return;
    const from = iconBoxOf(box, fromRow);
    const sheds = from !== null && isSeen(box, origin, from);
    if (sheds) {
      placeOn(shed, from);
      sources.push(from);
    }
    if (sources.length === 0) return;
    placeOn(fan, to);
    const gap = Math.max(...sources.map((source) => farGap(source, to)));
    onPull(
      (gap + FLIGHT) / EXTRACTOR_FAN_FALLOFF,
      PULL_STRENGTH * Math.max(1, gap / PULL_FAR),
      sheds,
    );
    cancelPullEnd?.();
    cancelPullEnd = engine.loop.at(engine.loop.now() + PULL_SECONDS, () => {
      endPull();
      parts?.onPull(0, PULL_STRENGTH, false);
    });
  }

  function readAtRest<T>(read: () => T) {
    let composed = read;
    for (const { readTarget } of movingGroups.values()) {
      const inner = composed;
      composed = () => readTarget(inner);
    }
    return composed();
  }

  function update(isFirst: boolean) {
    if (parts === null) return;
    if (movingGroups.size === 0) place(isFirst);
    else if (parts.box.querySelector(CURRENT) !== currentPage) {
      readAtRest(() => {
        place(false);
      });
    }
  }

  function place(isFirst: boolean) {
    if (parts === null) return;
    const { box, marker, hover } = parts;
    const origin = box.getBoundingClientRect();
    if (hoverRow !== null && hoverRow.isConnected) {
      follow(hover, boxIn(box, hoverRow));
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
    const to = boxIn(box, target);
    if (isFirst) {
      placeAt(marker, to);
      setShown(marker, 1);
      return;
    }
    if (target === was) {
      follow(marker, to);
      return;
    }
    const isSolid = marker.shown.target === 1 && marker.shown.get() > FADED;
    const isHovered = hoverRow === target && hover.shown.get() > FADED;
    const isOldSeen = isSolid && isSeen(box, origin, boxOf(marker));
    if (current !== wasPage) passDust(was, target, origin);
    if (isOldSeen) {
      springTo(marker, to);
      showTo(marker, true);
      // The hover fill fades on the marker's spring, as the marker comes
      // over it. Thus the row does not go empty while the marker moves.
      if (isHovered) hover.shown.to(0, { spring: marker.spring });
      return;
    }
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
      hover: hoverElement,
      shed,
      fan,
      onPull,
      canShed,
    }) {
      const marker = createFill(engine, markerElement, FLOW_SPRING);
      const hover = createFill(engine, hoverElement, HOVER_SPRING);
      parts = {
        box,
        marker,
        hover,
        shed,
        fan,
        canHover: window.matchMedia(CAN_HOVER_QUERY),
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
    moveWithRows(group, readTarget, restRate) {
      movingGroups.set(group, { readTarget, restRate });
      if (parts === null) return;
      const { box, marker, hover } = parts;
      const current = box.querySelector(CURRENT);
      const isNewPage = current !== currentPage;
      if (isNewPage) update(false);
      const row =
        current === null || isNewPage ? null : markerTargetOf(current);
      const shownHoverRow = hoverRow?.isConnected === true ? hoverRow : null;
      const [markerTo, hoverTo] = readAtRest(() => [
        row === null ? null : boxIn(box, row),
        shownHoverRow === null ? null : boxIn(box, shownHoverRow),
      ]);
      if (row !== null && markerTo !== null) {
        markerRow = row;
        if (marker.shown.target === 1) {
          springTo(marker, markerTo, FLOW_SPRING, restRate(row).trail);
        } else {
          placeAt(marker, markerTo);
          showTo(marker, true);
        }
      }
      if (shownHoverRow !== null && hoverTo !== null) {
        springTo(hover, hoverTo, FLOW_SPRING, restRate(shownHoverRow).trail);
      }
    },
    endMove(group) {
      movingGroups.delete(group);
      update(false);
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
      if (movingGroups.size === 0) {
        // From the marker's row, the fill grows in at the new row. A fill
        // that glides out of the marker looks like the marker comes off.
        glideTo(hover, boxIn(box, row), wasOnMarker);
        return;
      }
      const at = boxIn(box, row);
      const to = readAtRest(() => boxIn(box, row));
      const rest = [...movingGroups.values()]
        .map(({ restRate }) => restRate(row))
        .reduce((most, next) => (next.rate > most.rate ? next : most));
      if (wasOnMarker || hover.shown.get() <= FADED) {
        placeAt(hover, at);
        setShown(hover, 0);
        // On one spring, with the speed of the row, the fill stays on the row.
        const [x, y] = hover.box;
        x.set(at.x, { velocity: (to.x - at.x) * rest.rate });
        y.set(at.y, { velocity: (to.y - at.y) * rest.rate });
      }
      springTo(hover, to, FLOW_SPRING, rest.trail);
      showTo(hover, true);
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
