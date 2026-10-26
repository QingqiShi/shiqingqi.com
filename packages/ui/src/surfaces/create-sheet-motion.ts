import { MD_QUERY } from "../md-query.ts";
import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import { createMotionValue } from "../motion/create-motion-value.ts";
import { cssTween } from "../motion/css-tween.ts";
import { unit } from "../motion/mix.ts";
import { px, writeStyles, type Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";
import {
  boxOf,
  createSheetLift,
  liftedPage,
  type SheetClips,
  type SheetLift,
} from "./create-sheet-lift.ts";
import { recedePose, recedeShapeOf } from "./sheet-recede-context.ts";

/**
 * How the card comes and goes: below `md` it slides from below the screen,
 * from `md` up it rises a little as it grows, and under reduced motion it
 * fades in place.
 */
type Look = "slide" | "rise" | "fade";

/** How far down, in px, the card starts to rise, and how much smaller it starts. */
const RISE = { drop: 16, shrink: 0.06 } as const;
const FADE = cssTween(duration._200, easing.easeOut);
const SLIDE_FADE_OUT = cssTween(duration._300, easing.easeOut);
const LIFT_SPRING = springOf(springRoles.lift);
/**
 * How near to the element, as a share of the way, the card is at rest as it
 * goes back in. It is under 1px for a card of the screen's size, so the
 * sheet goes, and lets the page scroll, as soon as the card shows at rest.
 */
const INTO_ORIGIN_PRECISION = 1e-3;

/**
 * The parts of a Sheet that move.
 *
 * @internal
 */
export interface SheetMotionParts {
  /** The card: the sheet's surface, which takes the pointer. */
  readonly card: HTMLElement;
  /** The box that holds the card and what rides with it. */
  readonly mover: HTMLElement;
  /** The boxes between the mover and the card, which clip the card while it lifts. */
  readonly clips: SheetClips;
  /** The box that dims the page. */
  readonly dim: HTMLElement;
  /** The element that moves back while the card slides over it, or `null`. */
  readonly recede: HTMLElement | null;
}

/** @internal */
export interface SheetMotionEvents {
  /** The element the card lifts out of and goes back into below `md`, or `null` for the slide. */
  readonly liftFrom: () => HTMLElement | null;
  /** The parts of the card's content that fade in late as it lifts. */
  readonly liftContent: () => readonly HTMLElement[];
  /** The card has left the screen. */
  readonly onLeft: () => void;
  /** Each frame that the dimmed page moves, with how far it is in. */
  readonly onProgress: (progress: number) => void;
}

/**
 * The motion of a Sheet's card and of the dimmed page.
 *
 * @internal
 */
export interface SheetMotion {
  /** Brings the card in, or takes it out, from where it is, at the speed it has. */
  show(isShown: boolean): void;
  /** Stops the card where it is for a drag. Gives how far down it is. */
  grab(): number;
  /** Puts the card `y` px down from its rest, under the pointer. */
  drag(y: number): void;
  /** Lets go of the card at `velocity` px a second, down positive. The next motion starts at that speed. */
  release(velocity: number): void;
  /** Springs the card back to its rest after a drag. */
  settle(): void;
  /** Stops each motion and takes off every style it wrote. */
  destroy(): void;
}

function lookNow(engine: MotionEngine): Look {
  if (engine.reducedMotion) return "fade";
  return window.matchMedia(MD_QUERY).matches ? "rise" : "slide";
}

function opacityOf(value: number) {
  return String(Number(unit(value).toFixed(3)));
}

function moverPose(look: Look) {
  return (y: number, shown: number): Styles => {
    const opacity = look === "slide" ? "1" : opacityOf(shown);
    if (y === 0) return { transform: "none", opacity };
    if (look === "rise") {
      const scale = 1 - (RISE.shrink * Math.min(y, RISE.drop)) / RISE.drop;
      return {
        transform: `translateY(${px(y)}) scale(${scale.toFixed(4)})`,
        opacity,
      };
    }
    return { transform: `translateY(${px(y)})`, opacity };
  };
}

/**
 * Brings a Sheet's card in and takes it out. Below `md` the card slides up
 * from below the bottom of the screen and slides back down to leave, or,
 * where `liftFrom` gives an element, grows out of it and shrinks back into
 * it. From `md` up it rises a little, grows and fades in. Under reduced
 * motion it fades in and out in place. The dimmed page fades in and out
 * with it. Each motion starts from where the card is, at the speed it has,
 * so a close during an open, an open during a close and a drag take over
 * with no jump.
 *
 * @internal
 */
export function createSheetMotion(
  engine: MotionEngine,
  { card, mover, clips, dim, recede }: SheetMotionParts,
  events: SheetMotionEvents,
): SheetMotion {
  const y = createMotionValue(engine, 0, { precision: 0.5 });
  const shown = createMotionValue(engine, 0);
  const loss = createMotionValue(engine, 0);
  const progress = createMotionValue(engine, 1, {
    spring: LIFT_SPRING,
    precision: 2e-4,
  });
  let look: Look | null = null;
  let plain: readonly Binding[] = [];
  let lift: SheetLift | null = null;
  let grabbed = { y: 0, loss: 0, reach: 0 };
  // What showed over the element that the card last lifted out of.
  let lastCovers: {
    origin: HTMLElement;
    covers: readonly HTMLElement[];
  } | null = null;
  let reported = Number.NaN;

  function report(page: number) {
    if (page === reported) return;
    reported = page;
    events.onProgress(page);
  }

  const reportNow = () => {
    report(
      liftedPage(lift === null ? 1 : progress.get(), shown.get(), loss.get()),
    );
  };
  const stopReporting = [shown, loss, progress].map((value) =>
    value.subscribe(reportNow),
  );

  let receding: Binding | null = null;
  let recedeShape: Styles = {};

  /**
   * Moves the element that recedes back with the card, or stops. Where no
   * lift plays, `progress` is 1, so one pose fits both.
   */
  function setReceding(isReceding: boolean) {
    if (recede === null || isReceding === (receding !== null)) return;
    if (receding === null) {
      recedeShape = recedeShapeOf(recede);
      writeStyles(recede, recedeShape);
      receding = bind(recede, [progress, shown, loss], {
        pose: (at, faded, lost) => recedePose(liftedPage(at, faded, lost)),
      });
      return;
    }
    receding.unbind();
    receding = null;
    for (const property of Object.keys(recedeShape)) {
      recede.style.removeProperty(property);
    }
  }

  /** A motion can end before the frame that shows its end, so this tells the page that the card is away. */
  function left() {
    setReceding(false);
    report(0);
    events.onLeft();
  }

  /** The top of the card at its rest, in the viewport. */
  function restTop() {
    return engine.measure(() => card.getBoundingClientRect().top);
  }

  /** How far down, in px, the card at rest goes before it is fully below the screen. */
  function reachNow() {
    // `screen.height` can be larger than the screen, such as in a split view.
    // Then the card starts further down, which does no harm.
    const screenBottom =
      Math.max(window.visualViewport?.offsetTop ?? 0, 0) +
      Math.max(window.screen.height, window.innerHeight);
    return Math.max(screenBottom - restTop(), card.offsetHeight);
  }

  function unbindPlain() {
    for (const binding of plain) binding.unbind();
    plain = [];
    look = null;
  }

  function showPlain(next: Look) {
    setReceding(next === "slide");
    if (lift === null && look === next) return;
    lift?.stop();
    lift = null;
    unbindPlain();
    look = next;
    plain = [
      bind(mover, [y, shown], { pose: moverPose(next) }),
      bind(dim, [shown, loss], {
        pose: (faded, lost) => ({
          opacity: opacityOf(unit(faded) * (1 - unit(lost))),
        }),
      }),
    ];
  }

  function startLift(origin: HTMLElement, from: 0 | 1) {
    unbindPlain();
    const rest = boxOf(card);
    progress.set(from);
    setReceding(true);
    const current = createSheetLift(
      engine,
      origin,
      { card, mover, clips, dim, content: events.liftContent(), recede },
      { progress, drop: y, shown, loss },
      rest,
      lastCovers?.origin === origin ? lastCovers.covers : null,
    );
    lastCovers = { origin, covers: current.covers };
    lift = current;
    return current;
  }

  function liftOrigin() {
    const origin = events.liftFrom();
    return origin?.isConnected === true ? origin : null;
  }

  function lifted(current: SheetLift) {
    void progress.to(1).finished.then((done) => {
      if (done && lift === current) showPlain("slide");
    });
  }

  function intoOrigin() {
    void progress
      .to(0, { precision: INTO_ORIGIN_PRECISION })
      .finished.then((done) => {
        if (done) left();
      });
    y.to(0, { spring: LIFT_SPRING });
  }

  /** Where the card is while it is away. */
  function awayOf(next: Look) {
    if (next === "slide") return reachNow();
    return next === "rise" ? RISE.drop : 0;
  }

  function enter() {
    if (lift !== null) {
      lifted(lift);
      y.to(0, { spring: LIFT_SPRING });
      shown.to(1, { tween: FADE });
      loss.to(0);
      return;
    }
    const next = lookNow(engine);
    const isAway = !y.isMoving && !shown.isMoving && shown.get() === 0;
    if (isAway) loss.set(0);
    else loss.to(0, { reduced: FADE });
    const origin = isAway && next === "slide" ? liftOrigin() : null;
    if (origin !== null) {
      const current = startLift(origin, 0);
      y.set(0);
      shown.set(1);
      lifted(current);
      return;
    }
    showPlain(next);
    y.to(0, { reduced: FADE });
    shown.to(1, { tween: FADE });
  }

  function leave() {
    if (lift !== null) {
      intoOrigin();
      return;
    }
    const next = lookNow(engine);
    const origin = next === "slide" ? liftOrigin() : null;
    if (origin !== null) {
      startLift(origin, 1);
      intoOrigin();
      return;
    }
    showPlain(next);
    const motions = [
      shown.to(0, { tween: next === "slide" ? SLIDE_FADE_OUT : FADE }),
    ];
    if (next !== "fade") motions.push(y.to(awayOf(next)));
    void Promise.all(motions.map(({ finished }) => finished)).then((done) => {
      if (done.every(Boolean)) left();
    });
  }

  const initial = lookNow(engine);
  y.set(awayOf(initial));
  showPlain(initial);

  return {
    show(isShown) {
      if (isShown) enter();
      else leave();
    },
    grab() {
      y.stop();
      loss.stop();
      grabbed = {
        y: Math.max(0, y.get()),
        loss: loss.get(),
        reach: reachNow(),
      };
      return y.get();
    },
    drag(to) {
      y.set(to);
      // The dim keeps what it shows at the grab, and fades out on the way
      // down to `reach` and back in on the way up to the rest.
      const { y: from, loss: lost, reach } = grabbed;
      loss.set(
        to >= from
          ? lost + (1 - lost) * unit((to - from) / Math.max(1, reach - from))
          : lost * unit(to / from),
      );
    },
    release(velocity) {
      y.set(y.get(), { velocity });
    },
    settle() {
      y.to(0, { reduced: FADE });
      loss.to(0, { reduced: FADE });
    },
    destroy() {
      for (const stop of stopReporting) stop();
      lift?.stop();
      lift = null;
      unbindPlain();
      setReceding(false);
      for (const value of [y, shown, loss, progress]) value.stop();
    },
  };
}
