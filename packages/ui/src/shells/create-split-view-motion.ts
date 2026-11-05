import type { MotionEngine } from "../motion/create-motion-engine.ts";
import { createColumnParts } from "./split-view-motion/create-column-parts.ts";
import type { Push } from "./split-view-motion/create-push.ts";
import { createSharedFlights } from "./split-view-motion/create-shared-flights.ts";
import { createShownColumns } from "./split-view-motion/create-shown-columns.ts";
import {
  isViewStacked,
  SELECTOR,
} from "./split-view-motion/is-view-stacked.ts";
import { boxesAt, planMoves } from "./split-view-motion/plan-moves.ts";
import type {
  SplitViewChange,
  SplitViewMarks,
  SplitViewMotionEvents,
  SplitViewSnapshot,
} from "./split-view-motion/types.ts";

/**
 * The motion of a `NavigationSplitView`: the motion values, the bindings
 * that show them, and the Shared elements. The view reads a snapshot when a
 * navigation is about to change the composition, and plays the change after
 * the DOM changes. A change that comes while a motion runs turns each part
 * from where it is, at the speed it has. The motion writes only `transform`,
 * `translate`, `opacity` and `visibility`, once a frame. It reads the
 * layout only when a change starts, and the box of the content column each
 * time its size changes.
 *
 * @internal
 */
export interface SplitViewMotion {
  /** Reads where each Shared element shows now, as the screen shows it. */
  capture(): SplitViewSnapshot;
  /**
   * Plays the change from `snapshot` to the composition in the DOM now, as
   * motion number `motion`. Without a snapshot, the columns and the pages
   * move, but no Shared element flies. The sidebar folds and the content
   * column slides from where the screen showed them last. Where a detail
   * column comes or goes, the content column takes its last width again for
   * a moment, and the boxes of the content page move from their boxes there
   * to their new places in the content: see `pickBoxes`.
   */
  play(
    snapshot: SplitViewSnapshot | null,
    change: SplitViewChange,
    motion: number,
  ): void;
  /**
   * Starts a swipe back over the content, which `drag` moves and `release`
   * ends. False where there is no screen to swipe.
   */
  beginSwipe(): boolean;
  /** Puts the swiped screen `progress` of the way in. */
  drag(progress: number): void;
  /** Lets go of a swipe: the screen goes out where `pop`, and back in else, at `velocity` of progress a second. */
  release(pop: boolean, velocity: number): void;
  destroy(): void;
}

/** @internal */
export function createSplitViewMotion(
  engine: MotionEngine,
  view: HTMLElement,
  layer: HTMLElement,
  marks: SplitViewMarks,
  events: SplitViewMotionEvents,
): SplitViewMotion {
  let stopTicking: (() => void) | null = null;
  let folding: "fold" | "unfold" | null = null;
  let foldTimer: ReturnType<typeof setTimeout> | undefined;
  let played = 0;
  const columns = createColumnParts(engine, view, setFolding);
  const flights = createSharedFlights(
    engine,
    view,
    layer,
    marks,
    () => columns.push,
  );
  const columnWatch = createShownColumns(view, () => columns.slideNow());

  function setFolding(next: "fold" | "unfold" | null) {
    clearTimeout(foldTimer);
    if (folding !== next) {
      folding = next;
      events.onFold(next);
    }
  }

  function frame() {
    flights.tick();
    columns.dropResting();
    flights.dropResting();
    events.onFrame();
    if (engine.isMoving) return;
    stopTicking?.();
    stopTicking = null;
    events.onSettled(played);
    if (folding !== null) {
      // The dust needs a moment after the fold to reach the other form.
      foldTimer = setTimeout(() => {
        setFolding(null);
      }, 900);
    }
  }

  function start() {
    stopTicking ??= engine.loop.every(frame);
  }

  /** Stops every part but `keep`, a swiped screen that fades out where the finger left it. */
  function stopAll(keep: Push | null = null) {
    columns.dropAll(keep);
    flights.dropAll();
    stopTicking?.();
    stopTicking = null;
    // This stops the moves of `playLayout` too. It would also stop the fade
    // of `keep`, and reduced motion plays no `playLayout`.
    if (keep === null) engine.destroy();
    setFolding(null);
  }

  return {
    capture() {
      return flights.capture();
    },

    play(snapshot, change, motion) {
      played = motion;
      if (engine.reducedMotion) {
        const swiped =
          change.content === "pop" && columns.push?.isFadingOut === true
            ? columns.push
            : null;
        if (change.content !== null) {
          columns.clearAwaitingPop();
        }
        stopAll(swiped);
        columns.playReduced(change, swiped !== null);
        start();
        return;
      }
      if (change.content !== null) columns.stopAwaitingPop();
      const content = view.querySelector<HTMLElement>(SELECTOR.content);
      columnWatch.watch(content);
      const last = columnWatch.shown;
      const slide = columns.slideNow();
      const resizes =
        change.content === null &&
        (change.detail === "in" || change.detail === "out");
      const boxes =
        content === null || last === null || !resizes
          ? null
          : boxesAt(engine, view, content, last.x + slide, last.width);
      const starts = engine.measure(() => {
        const origin = view.getBoundingClientRect();
        const presentation = isViewStacked(view) ? "stacked" : "columns";
        const sidebar = columnWatch.sidebarShown();
        const foldChange =
          last?.sidebar === "full" && sidebar === "collapsed"
            ? "fold"
            : last?.sidebar === "collapsed" && sidebar === "full"
              ? "unfold"
              : null;
        const contentBox = content?.getBoundingClientRect() ?? null;
        let shift = 0;
        if (contentBox !== null) {
          // The next change can come before the observer runs.
          const shown = columnWatch.keep(contentBox, origin, sidebar);
          if (last !== null) shift = last.x + slide - shown.x;
        }
        const marksPlan = flights.plan(snapshot, origin, foldChange);
        return [
          columns.planContent(change, presentation),
          columns.planDetail(change.detail),
          columns.planOffset(content, contentBox, shift),
          columns.planFold(foldChange),
          marksPlan.start,
          planMoves(
            engine,
            view,
            content,
            boxes,
            marksPlan.moved,
            marksPlan.flying,
            shift,
          ),
        ];
      });
      for (const startPart of starts) startPart();
      start();
    },

    beginSwipe() {
      return columns.beginSwipe();
    },

    drag(progress) {
      columns.drag(progress);
      events.onFrame();
    },

    release(pop, velocity) {
      if (columns.release(pop, velocity)) start();
    },

    destroy() {
      clearTimeout(foldTimer);
      columns.clearAwaitingPop();
      columnWatch.disconnect();
      stopAll();
    },
  };
}
