import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import { opaqueFillOf } from "../../motion/fly-shared.ts";
import { rectIn } from "../../motion/play-layout.ts";
import {
  createDetail,
  createOffset,
  type Detail,
  type Offset,
} from "./create-detail.ts";
import { createFade } from "./create-fade.ts";
import { createPush, type Push } from "./create-push.ts";
import { SELECTOR } from "./is-view-stacked.ts";
import { CROSS_FADE, keepMoving } from "./show.ts";
import type { Part, SplitViewChange } from "./types.ts";

/** Where, in px, the box that holds `column` ends inside its padding. */
function innerEndOf(column: HTMLElement) {
  const columns = column.parentElement;
  if (columns === null) return column.getBoundingClientRect().right;
  const paddingEnd =
    Number.parseFloat(getComputedStyle(columns).paddingInlineEnd) || 0;
  return columns.getBoundingClientRect().right - paddingEnd;
}

/** The gap, in px, between `column` and the column before it. */
function gapBefore(column: HTMLElement) {
  const columns = column.parentElement;
  if (columns === null) return 0;
  return Number.parseFloat(getComputedStyle(columns).columnGap) || 0;
}

/** @internal */
interface ColumnParts {
  readonly push: Push | null;
  slideNow(): number;
  stopAwaitingPop(): void;
  clearAwaitingPop(): void;
  dropResting(): void;
  dropAll(keep: Push | null): void;
  playReduced(change: SplitViewChange, isSwiped: boolean): void;
  planContent(
    change: SplitViewChange,
    presentation: "columns" | "stacked",
  ): () => void;
  planDetail(kind: SplitViewChange["detail"]): () => void;
  planOffset(
    content: HTMLElement | null,
    box: DOMRect | null,
    dx: number,
  ): () => void;
  beginSwipe(): boolean;
  drag(progress: number): void;
  release(pop: boolean, velocity: number): boolean;
}

/** @internal */
export function createColumnParts(
  engine: MotionEngine,
  view: HTMLElement,
): ColumnParts {
  let push: Push | null = null;
  let detail: Detail | null = null;
  let offset: Offset | null = null;
  let fades: Part[] = [];
  /** A swipe let go to go back holds the screen out until the view pops it. */
  let awaitingPop: ReturnType<typeof setTimeout> | undefined;

  function slideNow() {
    return offset?.x.get() ?? 0;
  }

  function stopAwaitingPop() {
    if (awaitingPop === undefined) return;
    clearTimeout(awaitingPop);
    awaitingPop = undefined;
    if (push !== null && !push.isMoving()) {
      push.drop();
      push = null;
    }
  }

  function dropResting() {
    if (push !== null && !push.isMoving()) {
      if (awaitingPop === undefined) {
        push.drop();
        push = null;
      } else {
        // A fade that ends removes the styles that it wrote, also where the
        // push that waits for the pop wrote them. Thus the push writes its
        // pose again before the fades end.
        push.progress.set(push.progress.get());
      }
    }
    if (detail !== null && !detail.isMoving()) {
      detail.drop();
      detail = null;
    }
    if (offset !== null && !offset.isMoving()) {
      offset.drop();
      offset = null;
    }
    fades = fades.filter(keepMoving);
  }

  function dropAll(keep: Push | null) {
    if (push !== keep) push?.drop();
    detail?.drop();
    offset?.drop();
    for (const part of fades) {
      part.drop();
    }
    push = keep;
    detail = null;
    offset = null;
    fades = [];
  }

  function playReduced(change: SplitViewChange, isSwiped: boolean) {
    const content = view.querySelector<HTMLElement>(SELECTOR.content);
    const column = view.querySelector<HTMLElement>(SELECTOR.detail);
    const fadeOut = (element: HTMLElement | null | undefined) => {
      if (element != null) fades.push(createFade(engine, element, "out"));
    };
    const pageOf = (role: "under" | "current" | "leaving") =>
      content?.querySelector<HTMLElement>(SELECTOR.page(role));
    const stackRoot = view.querySelector<HTMLElement>(SELECTOR.stackRoot);
    if (change.content === "push") {
      if (change.stackRoot === null) {
        fadeOut(pageOf("under") ?? pageOf("leaving"));
      } else {
        const front =
          change.stackRoot === "front" ? stackRoot : pageOf("current");
        if (front != null) fades.push(createFade(engine, front, "in"));
      }
    } else if (change.content === "pop") {
      if (!isSwiped) {
        fadeOut(change.stackRoot === "front" ? stackRoot : pageOf("leaving"));
      }
    } else if (
      change.content === "swap" &&
      stackRoot?.dataset.splitViewStack !== "root"
    ) {
      fadeOut(pageOf("leaving"));
    }
    if (change.detail === "in" && column !== null) {
      fades.push(createFade(engine, column, "in"));
    } else if (change.detail === "out") {
      fadeOut(column);
    } else if (change.detail === "swap") {
      fadeOut(column?.querySelector<HTMLElement>(SELECTOR.page("leaving")));
    }
  }

  // Each `plan*` reads the layout while the motion is at its layout pose,
  // and gives the step that starts the motion after all the reads.
  const noStart = () => {};

  function planContent(
    { content: kind, stackRoot: rootPart }: SplitViewChange,
    presentation: "columns" | "stacked",
  ) {
    if (kind === null) return noStart;
    const content = view.querySelector<HTMLElement>(SELECTOR.content);
    if (content === null) return noStart;
    const under = content.querySelector<HTMLElement>(SELECTOR.page("under"));
    const current = content.querySelector<HTMLElement>(
      SELECTOR.page("current"),
    );
    const leaving = content.querySelector<HTMLElement>(
      SELECTOR.page("leaving"),
    );
    if (current === null) return noStart;
    const stackRoot = view.querySelector<HTMLElement>(SELECTOR.stackRoot);
    const isBesideRoot = stackRoot !== null && presentation === "columns";
    if (kind === "swap" || isBesideRoot) {
      if (leaving === null) return noStart;
      // The screen on top goes out over the sidebar, and it stays in front.
      if (stackRoot?.dataset.splitViewStack === "root" && !isBesideRoot) {
        return noStart;
      }
      return () => {
        if (push?.front === leaving) push.setFront(current);
        fades.push(createFade(engine, leaving, "out"));
      };
    }
    let back: HTMLElement | null;
    let front: HTMLElement | null;
    if (rootPart === "front") {
      front = stackRoot;
      back = kind === "push" ? (leaving ?? current) : current;
    } else if (rootPart === "back") {
      back = stackRoot;
      front = kind === "push" ? current : (leaving ?? current);
    } else {
      back = kind === "push" ? (under ?? leaving) : current;
      front = kind === "push" ? current : leaving;
    }
    if (front === null) return noStart;
    const target = kind === "push" ? 1 : 0;
    const running = push;
    if (
      running !== null &&
      running.front === front &&
      (running.back === back || running.back === null)
    ) {
      return () => {
        running.setBack(back);
        running.progress.to(target);
      };
    }
    running?.drop();
    push = null;
    const rect = rectIn(content, view.getBoundingClientRect());
    const fill = opaqueFillOf(stackRoot ?? content);
    return () => {
      push = createPush(
        engine,
        back,
        front,
        rect,
        presentation,
        fill,
        1 - target,
        false,
        stackRoot !== null,
      );
      push.progress.to(target);
    };
  }

  function planDetail(kind: SplitViewChange["detail"]) {
    if (kind === null) return noStart;
    const column = view.querySelector<HTMLElement>(SELECTOR.detail);
    if (column === null) return noStart;
    if (kind === "swap") {
      const leaving = column.querySelector<HTMLElement>(
        SELECTOR.page("leaving"),
      );
      return () => {
        if (leaving !== null) fades.push(createFade(engine, leaving, "out"));
      };
    }
    const target = kind === "in" ? 1 : 0;
    const running = detail;
    if (running !== null && running.column === column) {
      return () => {
        running.progress.to(target);
      };
    }
    running?.drop();
    detail = null;
    // The column moves its width and the gap before it, so that it leaves
    // the view and the content keeps the gap.
    const width = column.getBoundingClientRect().width + gapBefore(column);
    const fill = opaqueFillOf(column);
    return () => {
      detail = createDetail(engine, column, width, fill, 1 - target);
      detail.progress.to(target);
    };
  }

  function planOffset(
    content: HTMLElement | null,
    box: DOMRect | null,
    dx: number,
  ) {
    if (content === null || box === null) return noStart;
    const velocity = offset?.x.getVelocity() ?? 0;
    offset?.drop();
    offset = null;
    const column = view.querySelector<HTMLElement>(SELECTOR.detail);
    const edge =
      column === null
        ? 0
        : column.getBoundingClientRect().left - box.right - gapBefore(column);
    const room = column === null ? 0 : innerEndOf(column) - box.right;
    const fill = opaqueFillOf(content);
    return () => {
      const beside =
        column !== null && detail?.column === column && detail.isMoving()
          ? { detail, edge, room }
          : null;
      if (beside === null && Math.abs(dx) < 0.5) return;
      offset = createOffset(engine, content, dx, velocity, fill, beside);
    };
  }

  return {
    get push() {
      return push;
    },
    slideNow,
    stopAwaitingPop,
    clearAwaitingPop() {
      clearTimeout(awaitingPop);
      awaitingPop = undefined;
    },
    dropResting,
    dropAll,
    playReduced,
    planContent,
    planDetail,
    planOffset,

    beginSwipe() {
      const content = view.querySelector<HTMLElement>(SELECTOR.content);
      const front = content?.querySelector<HTMLElement>(
        SELECTOR.page("current"),
      );
      if (content == null || front == null) return false;
      if (push?.isFadingOut === true) return false;
      const stackRoot = view.querySelector<HTMLElement>(SELECTOR.stackRoot);
      const back =
        stackRoot ?? content.querySelector<HTMLElement>(SELECTOR.page("under"));
      if (push === null || push.front !== front) {
        push?.drop();
        push = createPush(
          engine,
          back,
          front,
          rectIn(content, view.getBoundingClientRect()),
          "stacked",
          opaqueFillOf(stackRoot ?? content),
          1,
          engine.reducedMotion,
          stackRoot !== null,
        );
      }
      push.progress.stop();
      return true;
    },

    drag(progress) {
      push?.progress.set(progress);
    },

    release(pop, velocity) {
      if (push === null) return false;
      if (pop && engine.reducedMotion) {
        push.fadeOut();
      } else {
        push.progress.to(pop ? 0 : 1, {
          velocity,
          reduced: { duration: CROSS_FADE },
        });
      }
      if (pop) {
        clearTimeout(awaitingPop);
        awaitingPop = setTimeout(() => {
          stopAwaitingPop();
        }, 4000);
      }
      return true;
    },
  };
}
