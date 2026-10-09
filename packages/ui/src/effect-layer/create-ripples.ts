import { indicesIn, peersOf } from "./plan-scopes.ts";
import type {
  EffectElementRecord,
  EffectScope,
  ElementRange,
} from "./types.ts";

/**
 * The pulses one element draws at once; a new pulse ends the oldest.
 *
 * @internal
 */
export const MAX_PULSES = 4;

/**
 * The nearby elements whose edges a ring fades out against.
 *
 * @internal
 */
export const MAX_NEIGHBOURS = 8;

/**
 * How far before another element's edge a ring has faded out, in CSS px.
 *
 * @internal
 */
export const ABSORB_DISTANCE = 16;

/** Seconds between two pulses of an ambient element. */
const AMBIENT_PERIOD = 3.6;
/** How late after its beat a frame can still start an ambient pulse. */
const BEAT_WINDOW = 0.25;
const AMBIENT_STRENGTH = 0.4;
const PRESS_STRENGTH = 1;
const FOCUS_STRENGTH = 0.5;
const HOVER_STRENGTH = { slow: 0.35, fast: 0.65 } as const;
/** The pointer speed, in CSS px per second, that gives the strongest hover. */
const FAST_POINTER = 1200;
/** A hover this soon after the element's last pulse starts no new one. */
const HOVER_COOLDOWN = 0.3;
/** How much a pulse leans towards the point that started it, from 0 to 1. */
const AIM = { hover: 0.5, press: 0.6, echo: 0.6 } as const;
/**
 * A pulse at least this strong sets off its rippling neighbours as its ring
 * reaches them, at `ECHO_GAIN` of its strength. The gain is below the
 * threshold, so an answer sets off nothing more.
 */
const ECHO_THRESHOLD = 0.75;
const ECHO_GAIN = 0.5;
/**
 * How strong the even wake of colour behind a crest is, against the crest:
 * as a ring leaves the edge, once it has gone, and behind the still ring.
 */
const WAKE = { start: 0.6, end: 0.08, held: 0.25 } as const;
/** Where the still ring sits under reduced motion, as a share of the reach. */
const HELD_RADIUS = 0.3;

/**
 * What starts a pulse: the pointer coming over the element, a press on it,
 * or keyboard focus moving into it.
 *
 * @internal
 */
export type RippleCause = "hover" | "press" | "focus";

/**
 * Where a ring is strongest, in the element's box space, where its edges are
 * at ±1: length 0 for an even ring, up to 1 for a ring that is gone on the
 * far side.
 *
 * @internal
 */
export interface RippleAim {
  readonly aimX: number;
  readonly aimY: number;
}

const EVEN: RippleAim = { aimX: 0, aimY: 0 };

/**
 * One ring that leaves an element's edge and travels out until it fades.
 *
 * @internal
 */
export interface RipplePulse extends RippleAim {
  /** Seconds on the effect layer's clock. */
  readonly start: number;
  /** From 0 to 1. */
  readonly strength: number;
  /** The ids of the neighbours this pulse has set off. */
  readonly answered: Set<number>;
}

/**
 * One ring as a frame draws it.
 *
 * @internal
 */
export interface RippleRing extends RippleAim {
  /** How far the crest is from the element's edge, in CSS px. */
  readonly front: number;
  /** How strong the crest is, from 0 to 1, before the aim. */
  readonly amount: number;
  /** How strong the even wake of colour behind the crest is, against it. */
  readonly wake: number;
}

/**
 * One element that draws rings this frame.
 *
 * @internal
 */
export interface RippleInstance {
  /** Its index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  /** One ring per pulse, or the still ring under reduced motion. */
  readonly rings: readonly RippleRing[];
  /** The `EffectFrame.elements` indices of the elements its rings fade against. */
  readonly neighbours: readonly number[];
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isIn = ({ firstElement, elementCount }: ElementRange, index: number) =>
  index >= firstElement && index < firstElement + elementCount;

/**
 * How far an element's rings travel, in CSS px: further from a larger
 * element, within limits so that a badge still shows a ring and a panel
 * does not wash over the page.
 *
 * @internal
 */
export function rippleReach(width: number, height: number) {
  return clamp(20 + 0.35 * Math.min(width, height), 32, 96);
}

/**
 * Seconds from a ring leaving the edge to its end: longer for a ring that
 * travels further.
 *
 * @internal
 */
export function pulseDuration(reach: number) {
  return 0.9 + reach / 200;
}

/**
 * How far the ring has travelled from the edge, at `progress` from 0 to 1 of
 * its duration. It leaves fast and slows down, as a wave on water does.
 *
 * @internal
 */
export function frontRadius(progress: number, reach: number) {
  return reach * (1 - (1 - clamp(progress, 0, 1)) ** 3);
}

/**
 * How strong the ring is at `progress`: it rises in the first few percent so
 * that it does not pop in, then fades out as it slows.
 *
 * @internal
 */
export function pulseEnvelope(progress: number) {
  if (progress <= 0 || progress >= 1) {
    return 0;
  }
  const rise = Math.min(1, progress / 0.06);
  return rise * rise * (3 - 2 * rise) * (1 - progress) ** 1.5;
}

/**
 * The ring of a pulse at `time`, or `null` before it starts and after it
 * ends. The wake is strong as the ring leaves, so the fill seems to swell
 * out, and thins into the crest as the ring travels.
 *
 * @internal
 */
export function pulseRing(
  pulse: RipplePulse,
  time: number,
  reach: number,
): RippleRing | null {
  const progress = (time - pulse.start) / pulseDuration(reach);
  if (progress <= 0 || progress >= 1) {
    return null;
  }
  return {
    front: frontRadius(progress, reach),
    amount: pulse.strength * pulseEnvelope(progress),
    aimX: pulse.aimX,
    aimY: pulse.aimY,
    wake: WAKE.end + (WAKE.start - WAKE.end) * (1 - progress) ** 2,
  };
}

/**
 * The still ring that marks hover, focus or a press under reduced motion,
 * where no ring travels.
 *
 * @internal
 */
export function heldRing(strength: number, reach: number): RippleRing {
  return {
    front: reach * HELD_RADIUS,
    amount: strength,
    ...EVEN,
    wake: WAKE.held,
  };
}

/**
 * The shortest distance between two boxes, in CSS px; 0 when they touch or
 * overlap.
 *
 * @internal
 */
export function boxGap(a: Box, b: Box) {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}

/**
 * The aim of a pulse started at a page point: the point in the box's own
 * space, where its edges are at ±1, scaled to `amount` at the edge and
 * beyond. A point at the centre gives an even ring.
 *
 * @internal
 */
export function aimAt(
  box: Box,
  x: number,
  y: number,
  amount: number,
): RippleAim {
  const localX = (x - box.x - box.width / 2) / Math.max(box.width / 2, 1);
  const localY = (y - box.y - box.height / 2) / Math.max(box.height / 2, 1);
  const length = Math.hypot(localX, localY);
  if (length < 1e-6) {
    return EVEN;
  }
  const scale = (amount * Math.min(1, length)) / length;
  return { aimX: localX * scale, aimY: localY * scale };
}

/**
 * The strength of a hover pulse: a pointer that comes in fast starts a
 * stronger ring than one that drifts in.
 *
 * @internal
 */
export function hoverStrength(pointerSpeed: number) {
  const share = clamp(pointerSpeed / FAST_POINTER, 0, 1);
  return (
    HOVER_STRENGTH.slow + (HOVER_STRENGTH.fast - HOVER_STRENGTH.slow) * share
  );
}

/**
 * The elements that the rings of `records[index]` fade out against, nearest
 * first: those of `peers`, its scope on its `<canvas>` element, that a ring
 * can get to. A box that touches or overlaps the element, such as a
 * container around it or a child inside it, is not one.
 *
 * @internal
 */
export function findNeighbours(
  records: readonly EffectElementRecord[],
  peers: ElementRange,
  index: number,
  reach: number,
) {
  const self = records[index];
  const limit = reach + ABSORB_DISTANCE;
  const near: { index: number; gap: number }[] = [];
  for (const other of indicesIn(peers)) {
    if (other === index) {
      continue;
    }
    const gap = boxGap(self, records[other]);
    if (gap > 0 && gap < limit) {
      near.push({ index: other, gap });
    }
  }
  near.sort((a, b) => a.gap - b.gap);
  return near.slice(0, MAX_NEIGHBOURS).map((item) => item.index);
}

/**
 * Whether a box, with its rings, meets the viewport.
 *
 * @internal
 */
export function isInView(box: Box, reach: number, viewport: Box) {
  return (
    box.x - reach < viewport.x + viewport.width &&
    box.x + box.width + reach > viewport.x &&
    box.y - reach < viewport.y + viewport.height &&
    box.y + box.height + reach > viewport.y
  );
}

/**
 * The range of `instances` whose elements are in a target's range of
 * `EffectFrame.elements`, as `[first, count]`.
 *
 * @internal
 */
export function instanceRange(
  instances: readonly Pick<RippleInstance, "elementIndex">[],
  firstElement: number,
  elementCount: number,
): readonly [number, number] {
  const indexFrom = (element: number) => {
    const index = instances.findIndex(
      ({ elementIndex }) => elementIndex >= element,
    );
    return index === -1 ? instances.length : index;
  };
  const first = indexFrom(firstElement);
  return [first, indexFrom(firstElement + elementCount) - first];
}

/**
 * The input of one step of the ripples.
 *
 * @internal
 */
export interface RippleStepInput {
  /** Seconds on the effect layer's clock. */
  readonly time: number;
  readonly elements: readonly EffectElementRecord[];
  readonly scopes: readonly EffectScope[];
  /** The role bit of an element that ripples. */
  readonly rippleBit: number;
  /** The role bit of a rippling element that also pulses on its own. */
  readonly ambientBit: number;
  /** CSS px per second. */
  readonly pointerSpeed: number;
  readonly viewport: Box;
  readonly reducedMotion: boolean;
  /**
   * The strength of the still ring for an element in view under reduced
   * motion: how much hover, focus or a press holds it; 0 for none.
   */
  readonly held: (element: Element) => number;
}

/**
 * What one step of the ripples gives the frame.
 *
 * @internal
 */
export interface RippleStep {
  /**
   * In the order of `EffectFrame.elements`, so the instances of each target
   * are one range.
   */
  readonly instances: readonly RippleInstance[];
  /** Whether a ring still travels, so the next frame must draw. */
  readonly animating: boolean;
  /**
   * When the next ambient beat starts, on the effect layer's clock, while an
   * ambient element is in view; otherwise `null`.
   */
  readonly nextBeat: number | null;
}

interface Rippling {
  readonly index: number;
  readonly record: EffectElementRecord;
  readonly reach: number;
}

const newPulse = (
  start: number,
  strength: number,
  aim: RippleAim = EVEN,
): RipplePulse => ({ start, strength, ...aim, answered: new Set() });

/**
 * The state of every ring the Ripple effect draws: the pulses each element
 * has started, the ones its neighbours answer with, and the ambient beat.
 * Events add causes at any time; each frame takes one step.
 *
 * @internal
 */
export function createRipples() {
  const pulsesById = new Map<number, RipplePulse[]>();
  const lastStarts = new Map<number, number>();
  const causes: {
    element: Element;
    cause: RippleCause;
    x: number;
    y: number;
  }[] = [];
  let lastBeat: number | null = null;

  function add(id: number, pulse: RipplePulse) {
    const pulses = pulsesById.get(id) ?? [];
    pulses.push(pulse);
    if (pulses.length > MAX_PULSES) {
      pulses.shift();
    }
    pulsesById.set(id, pulses);
  }

  function startCause(
    record: EffectElementRecord,
    cause: RippleCause,
    x: number,
    y: number,
    { time, pointerSpeed }: RippleStepInput,
  ) {
    const last = lastStarts.get(record.id);
    if (
      cause === "hover" &&
      last !== undefined &&
      time - last < HOVER_COOLDOWN
    ) {
      return;
    }
    lastStarts.set(record.id, time);
    if (cause === "focus") {
      add(record.id, newPulse(time, FOCUS_STRENGTH));
      return;
    }
    const strength =
      cause === "press" ? PRESS_STRENGTH : hoverStrength(pointerSpeed);
    add(record.id, newPulse(time, strength, aimAt(record, x, y, AIM[cause])));
  }

  /** Starts an ambient pulse on the beat, and returns when the next one is. */
  function beat(rippling: readonly Rippling[], input: RippleStepInput) {
    const { time, ambientBit, viewport } = input;
    const current = Math.floor(time / AMBIENT_PERIOD);
    const isNewBeat =
      current !== lastBeat && time - current * AMBIENT_PERIOD < BEAT_WINDOW;
    lastBeat = current;
    const ambient = rippling.filter(
      ({ record, reach }) =>
        (record.roles & ambientBit) !== 0 && isInView(record, reach, viewport),
    );
    if (ambient.length === 0) {
      return null;
    }
    if (isNewBeat) {
      for (const { record } of ambient) {
        add(record.id, newPulse(time, AMBIENT_STRENGTH));
      }
    }
    return (current + 1) * AMBIENT_PERIOD;
  }

  /** Sets off each rippling neighbour once, as a strong ring reaches it. */
  function echo(rippling: readonly Rippling[], input: RippleStepInput) {
    const { time } = input;
    for (const { record, reach } of rippling) {
      const peers = peersOf(input.scopes, record);
      for (const pulse of pulsesById.get(record.id) ?? []) {
        const ring =
          pulse.strength < ECHO_THRESHOLD
            ? null
            : pulseRing(pulse, time, reach);
        if (ring === null) {
          continue;
        }
        for (const { index, record: neighbour } of rippling) {
          if (
            neighbour === record ||
            !isIn(peers, index) ||
            pulse.answered.has(neighbour.id)
          ) {
            continue;
          }
          const gap = boxGap(record, neighbour);
          if (gap > 0 && gap <= ring.front) {
            pulse.answered.add(neighbour.id);
            const centreX = record.x + record.width / 2;
            const centreY = record.y + record.height / 2;
            add(
              neighbour.id,
              newPulse(
                time,
                ECHO_GAIN * ring.amount,
                aimAt(neighbour, centreX, centreY, AIM.echo),
              ),
            );
          }
        }
      }
    }
  }

  return {
    /**
     * Starts a pulse on a registered element at the next step. `x` and `y`
     * are the page point that started it.
     */
    start(element: Element, cause: RippleCause, x: number, y: number) {
      causes.push({ element, cause, x, y });
    },

    step(input: RippleStepInput): RippleStep {
      const { time, elements, rippleBit, reducedMotion } = input;
      const rippling: Rippling[] = [];
      for (const [index, record] of elements.entries()) {
        if ((record.roles & rippleBit) !== 0) {
          rippling.push({
            index,
            record,
            reach: rippleReach(record.width, record.height),
          });
        }
      }

      if (reducedMotion) {
        causes.length = 0;
        pulsesById.clear();
      }
      for (const { element, cause, x, y } of causes.splice(0)) {
        const match = rippling.find(({ record }) => record.element === element);
        if (match !== undefined) {
          startCause(match.record, cause, x, y, input);
        }
      }
      const nextBeat = reducedMotion ? null : beat(rippling, input);
      echo(rippling, input);

      const live = new Map<number, RipplePulse[]>();
      const instances: RippleInstance[] = [];
      for (const { index, record, reach } of rippling) {
        const pulses = (pulsesById.get(record.id) ?? []).filter(
          (pulse) => time - pulse.start < pulseDuration(reach),
        );
        if (pulses.length > 0) {
          live.set(record.id, pulses);
        }
        const held =
          reducedMotion && isInView(record, reach, input.viewport)
            ? input.held(record.element)
            : 0;
        if (pulses.length === 0 && held <= 0) {
          continue;
        }
        instances.push({
          elementIndex: index,
          rings:
            held > 0
              ? [heldRing(held, reach)]
              : pulses.flatMap((pulse) => pulseRing(pulse, time, reach) ?? []),
          neighbours: findNeighbours(
            elements,
            peersOf(input.scopes, record),
            index,
            reach,
          ),
        });
      }
      pulsesById.clear();
      for (const [id, pulses] of live) {
        pulsesById.set(id, pulses);
      }
      for (const id of lastStarts.keys()) {
        if (!rippling.some(({ record }) => record.id === id)) {
          lastStarts.delete(id);
        }
      }
      return {
        instances,
        animating: live.size > 0,
        nextBeat,
      };
    },
  };
}
