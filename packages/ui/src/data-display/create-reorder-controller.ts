import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../motion/create-motion-value.ts";
import { px } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { reorderTarget, roomOffsets, type RowBox } from "./reorder-target.ts";

/**
 * What the list knows of the rows from its props.
 *
 * @internal
 */
export interface ReorderProps {
  readonly ids: readonly string[];
  readonly fixed: ReadonlySet<string>;
  readonly onMove: (from: number, to: number) => void;
  readonly movedLabel: (name: string, place: number, count: number) => string;
}

interface Row {
  element: HTMLElement;
  offset: MotionValue;
  binding: Binding;
  handle: HTMLElement | null;
  name: string;
  detach: () => void;
}

interface Session {
  readonly id: string;
  readonly pointerId: number;
  readonly capture: HTMLElement;
  readonly threshold: number;
  readonly startY: number;
  readonly startScroll: number;
  readonly scroller: Element;
  readonly rows: readonly Row[];
  readonly boxes: readonly RowBox[];
  readonly from: number;
  readonly first: number;
  readonly last: number;
  readonly startOffset: number;
  clientY: number;
  target: number;
  isStarted: boolean;
  frame: number | null;
  readonly stop: () => void;
}

interface PendingMove {
  readonly tops: ReadonlyMap<Row, number>;
  readonly focus: string | null;
  readonly timer: ReturnType<typeof setTimeout>;
}

/** How near the edge of the scroller, in px, the pointer scrolls it, and how far it scrolls in a frame at most. */
const EDGE = 56;
const MAX_STEP = 18;
/** How long, in ms, a move waits for the new order before the rows go back. */
const ORDER_WAIT = 400;
const NO_DRAG_ON = "button, a, input, textarea, select, [contenteditable]";

const spring = springOf(springRoles.move);
/**
 * The presses that a row has taken for a drag. A list in a row of another
 * list sees the same press after the inner list, so all lists share this set.
 */
const claimed = new WeakSet<Event>();

/**
 * The ids from `first` to `last` around `index` that are not fixed, or null
 * when the row is fixed.
 *
 * @internal
 */
export function runOf(
  ids: readonly string[],
  fixed: ReadonlySet<string>,
  index: number,
): { first: number; last: number } | null {
  if (index < 0 || fixed.has(ids[index])) return null;
  let first = index;
  let last = index;
  while (first > 0 && !fixed.has(ids[first - 1])) first--;
  while (last < ids.length - 1 && !fixed.has(ids[last + 1])) last++;
  return { first, last };
}

function scrollerOf(element: Element): Element {
  for (let box = element.parentElement; box; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      box.scrollHeight > box.clientHeight
    ) {
      return box;
    }
  }
  return document.scrollingElement ?? document.documentElement;
}

function edgesOf(scroller: Element) {
  if (scroller === document.scrollingElement) {
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    return { top, bottom: top + (viewport?.height ?? window.innerHeight) };
  }
  const { top, bottom } = scroller.getBoundingClientRect();
  return { top, bottom };
}

/**
 * The state of one reorderable list that lives outside React: the rows and
 * their motion, the drag, and the move that waits for the new order. Each
 * row shows its offset from its place in the layout on its own `translate`,
 * and nothing else writes it.
 *
 * @internal
 */
export function createReorderController(
  engine: MotionEngine,
  {
    setLifted,
    setStatus,
    dragRow,
  }: {
    setLifted: (update: (id: string | null) => string | null) => void;
    setStatus: (status: string) => void;
    dragRow: boolean;
  },
) {
  const rows = new Map<string, Row>();
  let props: ReorderProps = {
    ids: [],
    fixed: new Set(),
    onMove: () => undefined,
    movedLabel: () => "",
  };
  let session: Session | null = null;
  let pending: PendingMove | null = null;

  const scrollOf = (scroller: Element) => scroller.scrollTop;

  function rowsInOrder() {
    const list: Row[] = [];
    for (const id of props.ids) {
      const row = rows.get(id);
      if (row === undefined) return null;
      list.push(row);
    }
    return list;
  }

  function lowerWhenAtRest(id: string, row: Row) {
    void row.offset.to(0, { spring }).finished.then((isLanded) => {
      if (isLanded) setLifted((lifted) => (lifted === id ? null : lifted));
    });
  }

  function settleAll() {
    for (const [id, row] of rows) {
      if (session?.id === id) continue;
      if (row.offset.get() !== 0 || row.offset.isMoving) {
        lowerWhenAtRest(id, row);
      }
    }
  }

  /** Springs each row from where `tops` shows it to its place in the layout now. */
  function playFrom(tops: ReadonlyMap<Row, number>) {
    for (const [id, row] of rows) {
      const top = tops.get(row);
      if (top === undefined) continue;
      const place = row.element.getBoundingClientRect().top - row.offset.get();
      const from = top - place;
      if (Math.abs(from) < 0.5 && !row.offset.isMoving) {
        row.offset.set(0);
        continue;
      }
      void row.offset.to(0, { spring, from }).finished.then((isLanded) => {
        if (isLanded) setLifted((lifted) => (lifted === id ? null : lifted));
      });
    }
  }

  function visibleTops() {
    const tops = new Map<Row, number>();
    for (const row of rows.values()) {
      tops.set(row, row.element.getBoundingClientRect().top);
    }
    return tops;
  }

  function commit(id: string, from: number, to: number, focus: boolean) {
    const count = props.ids.length;
    const name = rows.get(id)?.name ?? "";
    if (pending) clearTimeout(pending.timer);
    pending = {
      tops: visibleTops(),
      focus: focus ? id : null,
      timer: setTimeout(() => {
        pending = null;
        settleAll();
      }, ORDER_WAIT),
    };
    props.onMove(from, to);
    setStatus(props.movedLabel(name, to + 1, count));
  }

  function update(drag: Session) {
    const scrolled = scrollOf(drag.scroller) - drag.startScroll;
    const box = drag.boxes[drag.from];
    const lowest = drag.boxes[drag.first].top - box.top;
    const last = drag.boxes[drag.last];
    const highest = last.top + last.height - box.height - box.top;
    const offset = Math.min(
      highest,
      Math.max(
        lowest,
        drag.startOffset + drag.clientY + scrolled - drag.startY,
      ),
    );
    drag.rows[drag.from].offset.set(offset);
    const target = reorderTarget(
      drag.boxes,
      drag.from,
      box.top + offset,
      drag.first,
      drag.last,
    );
    if (target === drag.target) return;
    drag.target = target;
    const room = roomOffsets(drag.boxes, drag.from, target);
    for (let index = drag.first; index <= drag.last; index++) {
      if (index !== drag.from) {
        void drag.rows[index].offset.to(room[index], { spring });
      }
    }
  }

  function edgeScroll(drag: Session) {
    drag.frame = requestAnimationFrame(() => {
      drag.frame = null;
      if (session !== drag) return;
      const { top, bottom } = edgesOf(drag.scroller);
      const scrolled = scrollOf(drag.scroller) - drag.startScroll;
      const first = drag.boxes[drag.first];
      const last = drag.boxes[drag.last];
      const isRunAbove = first.top - scrolled < top;
      const isRunBelow = last.top + last.height - scrolled > bottom;
      const into =
        drag.clientY < top + EDGE && isRunAbove
          ? drag.clientY - top - EDGE
          : drag.clientY > bottom - EDGE && isRunBelow
            ? drag.clientY - bottom + EDGE
            : 0;
      if (into !== 0) {
        const step = Math.max(-1, Math.min(1, into / EDGE)) * MAX_STEP;
        drag.scroller.scrollTop += step;
        update(drag);
      }
      edgeScroll(drag);
    });
  }

  function begin(drag: Session) {
    drag.isStarted = true;
    setLifted(() => drag.id);
    edgeScroll(drag);
  }

  function end(isDrop: boolean) {
    const drag = session;
    if (!drag) return;
    session = null;
    drag.stop();
    if (drag.frame !== null) cancelAnimationFrame(drag.frame);
    if (!drag.isStarted) return;
    if (isDrop && drag.target !== drag.from) {
      commit(drag.id, drag.from, drag.target, false);
      return;
    }
    for (let index = drag.first; index <= drag.last; index++) {
      lowerWhenAtRest(props.ids[index], drag.rows[index]);
    }
  }

  function startDrag(
    id: string,
    event: PointerEvent,
    capture: HTMLElement,
    threshold: number,
  ) {
    if (session || pending) return false;
    const from = props.ids.indexOf(id);
    const run = runOf(props.ids, props.fixed, from);
    const list = rowsInOrder();
    if (!run || run.first === run.last || !list) return false;
    const boxes = list.map((row) => {
      const rect = row.element.getBoundingClientRect();
      return { top: rect.top - row.offset.get(), height: rect.height };
    });
    const scroller = scrollerOf(list[0].element);
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== event.pointerId || session !== drag) return;
      drag.clientY = move.clientY;
      if (!drag.isStarted) {
        if (Math.abs(move.clientY - drag.startY) < threshold) return;
        begin(drag);
      }
      update(drag);
    };
    const onUp = (up: PointerEvent) => {
      if (up.pointerId === event.pointerId) end(true);
    };
    const onCancel = () => {
      end(false);
    };
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape" || !drag.isStarted) return;
      key.preventDefault();
      end(false);
    };
    const drag: Session = {
      id,
      pointerId: event.pointerId,
      capture,
      threshold,
      startY: event.clientY,
      startScroll: scrollOf(scroller),
      scroller,
      rows: list,
      boxes,
      from,
      first: run.first,
      last: run.last,
      startOffset: list[from].offset.get(),
      clientY: event.clientY,
      target: from,
      isStarted: false,
      frame: null,
      stop: () => {
        capture.removeEventListener("pointermove", onMove);
        capture.removeEventListener("pointerup", onUp);
        capture.removeEventListener("pointercancel", onCancel);
        capture.removeEventListener("lostpointercapture", onCancel);
        window.removeEventListener("keydown", onKey, true);
        if (capture.hasPointerCapture(event.pointerId)) {
          capture.releasePointerCapture(event.pointerId);
        }
      },
    };
    session = drag;
    try {
      capture.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is gone cannot be captured. The drag ends at once.
      session = null;
      return false;
    }
    capture.addEventListener("pointermove", onMove);
    capture.addEventListener("pointerup", onUp);
    capture.addEventListener("pointercancel", onCancel);
    capture.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("keydown", onKey, true);
    if (threshold === 0) begin(drag);
    return true;
  }

  function onRowPointerDown(id: string, element: HTMLElement) {
    return (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (claimed.has(event)) return;
      const { target } = event;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-reorder-handle]")) return;
      if (target.closest(NO_DRAG_ON)) return;
      if (startDrag(id, event, element, 4)) claimed.add(event);
    };
  }

  return {
    /** Takes the latest props of the list. */
    sync(next: ReorderProps) {
      const isNewOrder =
        next.ids.length !== props.ids.length ||
        next.ids.some((id, index) => id !== props.ids[index]);
      props = next;
      if (!isNewOrder) return;
      if (session) end(false);
      if (pending) {
        clearTimeout(pending.timer);
        const { tops, focus } = pending;
        pending = null;
        playFrom(tops);
        if (focus) rows.get(focus)?.handle?.focus();
      }
    },
    /** Keeps the element of row `id`, and moves it from now on. */
    attach(id: string, element: HTMLElement) {
      if (session?.id === id) end(false);
      const offset = createMotionValue(engine, 0, { spring, precision: 0.5 });
      const binding = bind(element, offset, {
        pose: (y) => ({ translate: `0 ${px(y)}` }),
      });
      const listener = onRowPointerDown(id, element);
      if (dragRow) element.addEventListener("pointerdown", listener);
      const row: Row = {
        element,
        offset,
        binding,
        handle: rows.get(id)?.handle ?? null,
        name: rows.get(id)?.name ?? "",
        detach: () => {
          element.removeEventListener("pointerdown", listener);
          binding.unbind();
        },
      };
      rows.get(id)?.detach();
      rows.set(id, row);
      return () => {
        if (rows.get(id) !== row) return;
        if (session?.id === id) end(false);
        row.detach();
        rows.delete(id);
      };
    },
    attachHandle(id: string, handle: HTMLElement | null) {
      const row = rows.get(id);
      if (row) row.handle = handle;
    },
    rename(id: string, name: string) {
      const row = rows.get(id);
      if (row) row.name = name;
    },
    /** Starts a drag of row `id` from a press on its handle. */
    grab(id: string, event: PointerEvent, handle: HTMLElement) {
      if (!event.isPrimary || event.button !== 0) return false;
      return startDrag(id, event, handle, 0);
    },
    /** Moves row `id` by `step` places, inside its run, and keeps focus on its handle. */
    step(id: string, step: -1 | 1, focus: boolean) {
      if (session || pending) return;
      const from = props.ids.indexOf(id);
      const run = runOf(props.ids, props.fixed, from);
      if (!run) return;
      const to = from + step;
      if (to < run.first || to > run.last) return;
      commit(id, from, to, focus);
    },
    destroy() {
      end(false);
      if (pending) clearTimeout(pending.timer);
      pending = null;
      for (const row of rows.values()) row.detach();
      rows.clear();
    },
  };
}

/** @internal */
export type ReorderController = ReturnType<typeof createReorderController>;
