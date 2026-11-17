"use client";

import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/ssr/DotsSixVertical";
import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { color } from "../color.stylex.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { quietSurface } from "../primitives/quiet-surface.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { controlSize, layer, shadow } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  createReorderController,
  runOf,
  type ReorderController,
} from "./create-reorder-controller.ts";

interface ReorderContextValue {
  readonly controller: ReorderController;
  readonly ids: readonly string[];
  readonly fixed: ReadonlySet<string>;
  readonly lifted: string | null;
  readonly keyboard: boolean;
  readonly handleLabel: (name: string) => string;
}

const ReorderContext = createContext<ReorderContextValue | null>(null);

export interface ReorderListProps {
  /**
   * The ids of the rows, in the order they show. Each row calls
   * `useReorderItem` with its id.
   *
   * @zh 行的 id，按显示顺序排列。每一行都以自己的 id 调用 `useReorderItem`。
   */
  ids: readonly string[];
  /**
   * Called when a row moves, with its place before and after the move.
   * Put the rows in the new order: the rows spring from where they show
   * to their new places.
   *
   * @zh 行移动时调用，参数为移动前后的位置。请把行按新顺序排列，行会从当前显示的位置弹到新位置。
   */
  onMove: (from: number, to: number) => void;
  /**
   * The ids of rows that keep their place. They have no handle, and no row
   * moves past them.
   *
   * @zh 保持原位的行的 id。这些行没有拖动手柄，其他行也不能越过它们。
   */
  fixed?: readonly string[];
  /**
   * The name of the handle of a row, from the row's name, such as
   * `Move Lisbon`.
   *
   * @zh 行的拖动手柄的名称，由行名生成，例如 `移动 里斯本`。
   */
  handleLabel: (name: string) => string;
  /**
   * What a screen reader hears after a move, such as
   * `Lisbon: place 2 of 5`.
   *
   * @zh 移动后屏幕阅读器读出的内容，例如 `里斯本：第 2 项，共 5 项`。
   */
  movedLabel: (name: string, place: number, count: number) => string;
  /**
   * Whether the handle takes focus, and Up and Down on it move the row.
   * Turn it off when each row has a menu with `moveUp` and `moveDown`
   * instead, so that a row is one stop for Tab. Defaults to `true`.
   *
   * @zh 拖动手柄是否可获得焦点，并可用上下方向键移动行。当每一行都有带 `moveUp` 和 `moveDown` 的菜单时可关闭，让每行只占一个 Tab 停靠点。默认为 `true`。
   */
  keyboard?: boolean;
  /**
   * Whether a mouse can drag a row from anywhere on it, not only from its
   * handle. A finger always drags the handle, so that a swipe on the row
   * still scrolls. Set it once: a change after the first render is not
   * seen.
   *
   * @zh 鼠标是否可以从行的任意位置拖动，而不仅是手柄。手指始终只能拖动手柄，这样在行上滑动仍可滚动页面。只在首次渲染时读取。
   */
  dragRow?: boolean;
  /**
   * The list, with one row for each id.
   *
   * @zh 列表本身，每个 id 对应一行。
   */
  children: ReactNode;
}

/**
 * Rows that change places in their list: a drag of a row's handle, with a
 * finger or a pointer; Up and Down on the focused handle; or `moveUp` and
 * `moveDown`, such as from a menu on the row. The row that a drag holds
 * rises and follows the pointer, the rows it passes make room on the
 * system's spring, and the list scrolls when the pointer nears its edge.
 * A screen reader hears the new place after each move.
 *
 * It renders no element of its own: render the list in it, and give each
 * row the `ref`, `css` and `handle` of `useReorderItem`. The rows move on
 * their own `translate`, so a row must not be a box that another motion
 * moves the same way, such as a `FlowBlock` or a `Card`.
 */
export function ReorderList({
  ids,
  onMove,
  fixed = [],
  handleLabel,
  movedLabel,
  keyboard = true,
  dragRow = false,
  children,
}: ReorderListProps) {
  const engine = useMotionEngine();
  const [lifted, setLifted] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [controller] = useState(() =>
    createReorderController(engine, { setLifted, setStatus, dragRow }),
  );
  const fixedSet = new Set(fixed);

  useLayoutEffect(() => {
    controller.sync({ ids, fixed: fixedSet, onMove, movedLabel });
  });
  useEffect(
    () => () => {
      controller.destroy();
    },
    [controller],
  );

  return (
    <ReorderContext
      value={{
        controller,
        ids,
        fixed: fixedSet,
        lifted,
        keyboard,
        handleLabel,
      }}
    >
      {children}
      <div role="status" css={a11y.srOnly}>
        {status}
      </div>
    </ReorderContext>
  );
}

/** What `useReorderItem` gives a row. */
export interface ReorderItem {
  /** Put it on the row's element, such as its `<li>`. */
  readonly ref: (element: HTMLElement | null) => (() => void) | undefined;
  /** Compose it on the row's element: it lifts the row while a drag holds it. */
  readonly css: StyleProp;
  /** Where a drag picks the row up. A row that cannot move gets an empty box of the same size, so that the rows line up. */
  readonly handle: ReactNode;
  /** Moves the row one place up, or null where it cannot go up. */
  readonly moveUp: (() => void) | null;
  /** Moves the row one place down, or null where it cannot go down. */
  readonly moveDown: (() => void) | null;
  /** Whether a drag holds the row now. */
  readonly isLifted: boolean;
}

/**
 * One row of the nearest `ReorderList`. `name` is what a screen reader
 * hears for the row, such as its title.
 */
export function useReorderItem(id: string, name: string): ReorderItem {
  const context = use(ReorderContext);
  if (context === null) {
    throw new Error("useReorderItem must be used inside a ReorderList.");
  }
  const { controller, ids, fixed, lifted, keyboard, handleLabel } = context;

  const ref = (element: HTMLElement | null) =>
    element ? controller.attach(id, element) : undefined;
  useLayoutEffect(() => {
    controller.rename(id, name);
  }, [controller, id, name]);
  const handleRef = (handle: HTMLElement | null) => {
    controller.attachHandle(id, handle);
  };

  const index = ids.indexOf(id);
  const run = runOf(ids, fixed, index);
  const canMove = run !== null && run.first < run.last;
  const isLifted = lifted === id;
  const moveUp =
    run && index > run.first
      ? () => {
          controller.step(id, -1, false);
        }
      : null;
  const moveDown =
    run && index < run.last
      ? () => {
          controller.step(id, 1, false);
        }
      : null;

  let handle: ReactNode;
  if (!canMove) {
    handle = <span aria-hidden css={[styles.handle, styles.noHandle]} />;
  } else if (keyboard) {
    handle = (
      <button
        ref={handleRef}
        type="button"
        data-reorder-handle=""
        aria-label={handleLabel(name)}
        aria-keyshortcuts="ArrowUp ArrowDown"
        css={[
          buttonReset.base,
          corner.squircle_round,
          quietSurface.interactive,
          styles.handle,
          isLifted && styles.handleHeld,
        ]}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (controller.grab(id, event.nativeEvent, event.currentTarget)) {
            event.preventDefault();
          }
        }}
        onKeyDown={(event) => {
          const step =
            event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
          if (step === 0 || event.altKey || event.metaKey) return;
          event.preventDefault();
          controller.step(id, step, true);
        }}
      >
        <DotsSixVerticalIcon weight="bold" aria-hidden />
      </button>
    );
  } else {
    handle = (
      <span
        ref={handleRef}
        data-reorder-handle=""
        aria-hidden
        css={[
          a11y.touchTarget,
          styles.handle,
          styles.pointerHandle,
          isLifted && styles.handleHeld,
        ]}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (controller.grab(id, event.nativeEvent, event.currentTarget)) {
            event.preventDefault();
          }
        }}
      >
        <DotsSixVerticalIcon weight="bold" />
      </span>
    );
  }

  return {
    ref,
    css: [isLifted && styles.lifted],
    handle,
    moveUp,
    moveDown,
    isLifted,
  };
}

const styles = stylex.create({
  handle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: controlSize._8,
    blockSize: controlSize._8,
    fontSize: controlSize._5,
    color: color.mutedForeground,
    cursor: "grab",
    touchAction: "none",
  },
  pointerHandle: {
    userSelect: "none",
  },
  handleHeld: {
    cursor: "grabbing",
  },
  // A row that cannot move keeps the handle's space, so that the rows of
  // the list end at the same place.
  noHandle: {
    visibility: "hidden",
  },
  lifted: {
    position: "relative",
    zIndex: layer.raised,
    backgroundColor: color.popover,
    boxShadow: shadow._4,
  },
});
