import type { EffectFrame, EffectPointer } from "./types.ts";

/**
 * The most dust particles alive at once: the length of the particle buffer.
 *
 * @internal
 */
export const DUST_PARTICLE_BUDGET = 4096;

/**
 * The longest a dust particle lives, in seconds.
 *
 * @internal
 */
export const DUST_MAX_LIFE = 10;

/**
 * The most particles one frame sheds: the length of the spawn list.
 *
 * @internal
 */
export const DUST_MAX_SPAWNS_PER_FRAME = 64;

/**
 * The most particles all elements shed in a second together, so that none is
 * reused while it lives.
 */
const MAX_TOTAL_RATE = DUST_PARTICLE_BUDGET / DUST_MAX_LIFE;
/** How far past the viewport, as a share of its height, an element sheds. */
const VIEWPORT_MARGIN = 0.25;
/** How much more dust an extractor fan lifts off an element at its edge. */
const FAN_LIFT = 3;
/** How near the edge the pointer stirs up more dust, in CSS px. */
const STIR_DISTANCE = 96;
/** The pointer speed that stirs up the most dust, in CSS px per second. */
const STIR_SPEED = 800;
/** How much more dust a still pointer and a fast one stir up. */
const STIR_STILL = 0.5;
const STIR_MOVING = 3;

/**
 * A box in page coordinates, CSS px.
 *
 * @internal
 */
export interface DustBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * An element that sheds dust, as one frame measured it.
 *
 * @internal
 */
export interface DustEmitter extends DustBox {
  /** Stays the same while the element stays registered. */
  readonly id: number;
  /** Its index in `EffectFrame.elements`. */
  readonly index: number;
  /** Particles a second along every 100 CSS px of its edge. */
  readonly density: number;
}

/**
 * An element that pulls dust in, as one frame measured it.
 *
 * @internal
 */
export interface DustFan extends DustBox {
  readonly id: number;
  /** How far from its edge it pulls, CSS px. */
  readonly reach: number;
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** The gap between two boxes, 0 when they touch or overlap. */
const gapBetween = (first: DustBox, second: DustBox) =>
  Math.hypot(
    Math.max(
      0,
      first.x - second.x - second.width,
      second.x - first.x - first.width,
    ),
    Math.max(
      0,
      first.y - second.y - second.height,
      second.y - first.y - first.height,
    ),
  );

function isNearViewport(box: DustBox, viewport: EffectFrame["viewport"]) {
  const margin = viewport.height * VIEWPORT_MARGIN;
  return (
    box.y + box.height > viewport.y - margin &&
    box.y < viewport.y + viewport.height + margin &&
    box.x + box.width > viewport.x &&
    box.x < viewport.x + viewport.width
  );
}

/**
 * Whether the dust an element sheds can come into view, so it sheds this
 * frame: the element is in the viewport or within a quarter of its height of
 * it, or an extractor fan that is pulls from as far as the element.
 *
 * @internal
 */
export function isShedding(
  emitter: DustEmitter,
  fans: readonly DustFan[],
  viewport: EffectFrame["viewport"],
) {
  return (
    isNearViewport(emitter, viewport) ||
    fans.some(
      (fan) =>
        fan.id !== emitter.id &&
        isNearViewport(fan, viewport) &&
        gapBetween(emitter, fan) < fan.reach,
    )
  );
}

/**
 * The particles a second the element sheds: its density along its edge, more
 * the closer an extractor fan pulls at it, and more while the pointer is near
 * it, the most when the pointer moves fast.
 *
 * @internal
 */
export function emissionRate(
  emitter: DustEmitter,
  fans: readonly DustFan[],
  pointer: EffectPointer,
) {
  let rate = (emitter.density * 2 * (emitter.width + emitter.height)) / 100;
  let lift = 0;
  for (const fan of fans) {
    if (fan.id !== emitter.id && fan.reach > 0) {
      lift = Math.max(lift, 1 - gapBetween(emitter, fan) / fan.reach);
    }
  }
  rate *= 1 + FAN_LIFT * lift;
  if (pointer.present) {
    const point = { x: pointer.x, y: pointer.y, width: 0, height: 0 };
    const near = 1 - smoothstep(0, STIR_DISTANCE, gapBetween(emitter, point));
    const speed = Math.min(
      1,
      Math.hypot(pointer.velocityX, pointer.velocityY) / STIR_SPEED,
    );
    rate *= 1 + near * (STIR_STILL + (STIR_MOVING - STIR_STILL) * speed);
  }
  return rate;
}

/**
 * The particles to shed this frame, as the `index` of the emitter for each,
 * taking turns between emitters. `carried` keeps each emitter's fraction of
 * a particle from frame to frame, by `id`, and drops the emitters that are
 * gone. When the emitters together shed more than the budget allows, each
 * sheds less by the same share.
 *
 * @internal
 */
export function scheduleDustSpawns(
  emitters: readonly DustEmitter[],
  rates: readonly number[],
  delta: number,
  carried: Map<number, number>,
): number[] {
  const total = rates.reduce((sum, rate) => sum + rate, 0);
  const scale = total > MAX_TOTAL_RATE ? MAX_TOTAL_RATE / total : 1;
  const counts: number[] = [];
  const present = new Set<number>();
  for (const [index, emitter] of emitters.entries()) {
    const owed = (carried.get(emitter.id) ?? 0) + rates[index] * scale * delta;
    const count = Math.floor(owed);
    carried.set(emitter.id, owed - count);
    counts.push(count);
    present.add(emitter.id);
  }
  for (const id of carried.keys()) {
    if (!present.has(id)) {
      carried.delete(id);
    }
  }

  const spawns: number[] = [];
  for (let round = 0; spawns.length < DUST_MAX_SPAWNS_PER_FRAME; round++) {
    let added = false;
    for (const [index, emitter] of emitters.entries()) {
      if (round < counts[index] && spawns.length < DUST_MAX_SPAWNS_PER_FRAME) {
        spawns.push(emitter.index);
        added = true;
      }
    }
    if (!added) {
      break;
    }
  }
  return spawns;
}

/**
 * The particle slots that can hold a live particle: the ones shed within the
 * last `DUST_MAX_LIFE` seconds, oldest first, from slot `start` on round the
 * ring. The particles shed this frame are the newest of them.
 *
 * @internal
 */
export interface LiveSlots {
  readonly start: number;
  readonly length: number;
}

/**
 * Follows which particle slots can hold a live particle. Time is the
 * simulation's, which runs slower than the clock when frames are slow, so a
 * slot leaves only once its particle has died.
 *
 * @internal
 */
export function createLiveSlots() {
  const shed: { time: number; count: number }[] = [];
  let time = 0;
  let end = 0;
  let length = 0;
  return {
    /**
     * Moves the simulation on by `delta` seconds and sheds `count` particles
     * into the slots after the newest.
     */
    advance(delta: number, count: number): LiveSlots {
      time += delta;
      while (shed.length > 0 && time - shed[0].time >= DUST_MAX_LIFE) {
        length -= shed[0].count;
        shed.shift();
      }
      if (count > 0) {
        shed.push({ time, count });
        length += count;
      }
      end = (end + count) % DUST_PARTICLE_BUDGET;
      const live = Math.min(length, DUST_PARTICLE_BUDGET);
      return {
        start: (end - live + DUST_PARTICLE_BUDGET) % DUST_PARTICLE_BUDGET,
        length: live,
      };
    },
    /** Forgets every particle, as when the simulation stops. */
    clear() {
      shed.length = 0;
      length = 0;
    },
  };
}
