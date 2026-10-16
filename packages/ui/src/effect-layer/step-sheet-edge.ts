/**
 * How many samples the edge has across the straight part of the top edge,
 * the first and the last pinned at the corners.
 *
 * @internal
 */
export const SHEET_EDGE_SAMPLES = 32;

/**
 * The wave's speed across the edge, in edge lengths per second: the
 * fundamental slosh takes `2 / WAVE_SPEED` seconds.
 */
const WAVE_SPEED = 3.4;
/** How fast the water loses its motion, per second. */
const DAMPING = 4.5;
/**
 * How fast neighbouring samples share their motion, in edge lengths squared
 * per second: it takes the short ripples out, so the surface stays smooth.
 */
const VISCOSITY = 0.007;
/** How much of a change in the card's speed the water keeps, as its own. */
const INERTIA = 0.21;
/**
 * The most speed one step can give the water, in px per second: a card
 * that jumps, such as onto a keyboard, splashes no higher than one that
 * lands.
 */
const MAX_IMPULSE = 360;
/** The edge never dips further than this below the card's rigid top, in px. */
const FLOOR = 3;
/** The edge never swells further than this above it, in px. */
const CEILING = 16;
/** How hard the floor and the ceiling push back, per second squared. */
const WALL = 2500;
/** The peak a finger raises, in px, and its width as a share of the edge. */
const FINGER_PEAK = 9;
const FINGER_WIDTH = 0.14;
/** How much of an overdrag goes into the peak, and into its width. */
const STRETCH_PEAK = 0.18;
const STRETCH_WIDTH = 1 / 600;
/** How hard the finger pulls the edge to its peak, per second squared. */
const FINGER_PULL = 2500;
/** The longest step the integrator takes, in seconds. */
const MAX_SUBSTEP = 1 / 240;

/**
 * The edge's height field: how far each sample is above the card's rigid
 * top, in px, and how fast it moves, in px per second, with the card's
 * speed at the last step, in px per second down the page.
 *
 * @internal
 */
export interface SheetEdgeField {
  readonly height: Float32Array;
  readonly velocity: Float32Array;
  readonly cardVelocity: number;
}

/**
 * What moves the edge in one step.
 *
 * @internal
 */
export interface SheetEdgeInput {
  /** The card's speed now, in px per second down the page. */
  readonly cardVelocity: number;
  /** How far a drag holds the card above its rest, in px, 0 or more. */
  readonly stretch: number;
  /**
   * Where the finger holds the edge, as a share across the straight part,
   * or `null` while no finger holds it.
   */
  readonly finger: number | null;
}

/**
 * An edge at rest.
 *
 * @internal
 */
export function restingSheetEdge(): SheetEdgeField {
  return {
    height: new Float32Array(SHEET_EDGE_SAMPLES),
    velocity: new Float32Array(SHEET_EDGE_SAMPLES),
    cardVelocity: 0,
  };
}

/**
 * How much the edge moves: its highest swell or deepest dip, in px, plus
 * its fastest motion as the distance it covers in a tenth of a second.
 *
 * @internal
 */
export function sheetEdgeEnergy({ height, velocity }: SheetEdgeField) {
  let energy = 0;
  for (let i = 0; i < height.length; i++) {
    energy = Math.max(
      energy,
      Math.abs(height[i]) + Math.abs(velocity[i]) * 0.1,
    );
  }
  return energy;
}

/**
 * Moves the edge on by `delta` seconds. The water surface across the top of
 * the card is a wave on a string pinned at the corners: a change in the
 * card's speed goes into the water, which keeps its momentum, so a card
 * that stops rising sends a swell up through the middle, and a card that
 * starts to drop leaves the edge trailing behind. A finger pulls the edge
 * to a peak under it, higher and wider the further it holds the card above
 * its rest, and the wave carries the rest after it. A soft floor keeps the
 * edge from dipping into the card's content, and a soft ceiling keeps the
 * swell modest.
 *
 * @internal
 */
export function stepSheetEdge(
  field: SheetEdgeField,
  input: SheetEdgeInput,
  delta: number,
): SheetEdgeField {
  const count = field.height.length;
  const height = new Float32Array(field.height);
  const velocity = new Float32Array(field.velocity);
  const spacing = 1 / (count - 1);
  const stiffness = (WAVE_SPEED * WAVE_SPEED) / (spacing * spacing);
  const sharing = VISCOSITY / (spacing * spacing);
  // The card's change of speed is an impulse on the water: the water keeps
  // the speed the card lost, up when the card stops rising.
  const impulse = Math.max(
    -MAX_IMPULSE,
    Math.min(MAX_IMPULSE, (input.cardVelocity - field.cardVelocity) * INERTIA),
  );
  for (let i = 1; i < count - 1; i++) {
    velocity[i] += impulse;
  }
  const peak =
    input.finger === null ? 0 : FINGER_PEAK + input.stretch * STRETCH_PEAK;
  const width = FINGER_WIDTH + input.stretch * STRETCH_WIDTH;
  const substeps = Math.max(1, Math.ceil(delta / MAX_SUBSTEP));
  const step = delta / substeps;
  const was = new Float32Array(count);
  for (let s = 0; s < substeps; s++) {
    was.set(velocity);
    for (let i = 1; i < count - 1; i++) {
      const h = height[i];
      let force =
        stiffness * (height[i - 1] - 2 * h + height[i + 1]) +
        sharing * (was[i - 1] - 2 * was[i] + was[i + 1]) -
        DAMPING * velocity[i];
      if (h < -FLOOR) {
        force += WALL * (-FLOOR - h) - DAMPING * 3 * velocity[i];
      } else if (h > CEILING) {
        force += WALL * (CEILING - h) - DAMPING * 3 * velocity[i];
      }
      if (input.finger !== null) {
        const away = (i * spacing - input.finger) / width;
        const target = peak * Math.exp(-away * away);
        const hold = Math.exp(-away * away * 0.5);
        force +=
          FINGER_PULL * (target - h) * hold - DAMPING * 2 * hold * velocity[i];
      }
      velocity[i] += force * step;
    }
    for (let i = 1; i < count - 1; i++) {
      height[i] += velocity[i] * step;
      // The soft floor gives, but the content under the edge must not show.
      if (height[i] < -FLOOR - 1) {
        height[i] = -FLOOR - 1;
        velocity[i] = Math.max(velocity[i], 0);
      }
    }
  }
  return { height, velocity, cardVelocity: input.cardVelocity };
}

/**
 * The edge, with every sample finite; one that is not rests the edge.
 *
 * @internal
 */
export function finiteSheetEdge(field: SheetEdgeField): SheetEdgeField {
  const finite = (values: Float32Array) =>
    values.every((value) => Number.isFinite(value));
  return finite(field.height) &&
    finite(field.velocity) &&
    Number.isFinite(field.cardVelocity)
    ? field
    : restingSheetEdge();
}
