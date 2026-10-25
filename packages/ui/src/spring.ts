/**
 * How a spring moves: `response` is the time, in seconds, of one swing of
 * the undamped spring, and `damping` is the damping ratio, where 1 settles
 * with no overshoot and less than 1 overshoots.
 *
 * @internal
 */
export interface SpringConfig {
  readonly response: number;
  readonly damping: number;
}

/** A value closer to its target than this, and slower than `REST_SPEED`, is at rest. */
const REST_DISTANCE = 2e-4;
const REST_SPEED = 2e-3;
/** The integration takes at least this many steps a second, so that a long frame stays stable. */
const STEPS_PER_SECOND = 480;

/**
 * A damped spring that pulls `value` towards `target`. A new target keeps
 * the value and the velocity that the spring has now, so a motion that is
 * cut off turns from where it is, at the speed it has.
 *
 * @internal
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private stiffness = 0;
  private friction = 0;
  private pending: { target: number; delay: number } | null = null;

  constructor(value: number, config: SpringConfig) {
    this.value = value;
    this.target = value;
    this.configure(config);
  }

  configure({ response, damping }: SpringConfig) {
    this.stiffness = ((2 * Math.PI) / response) ** 2;
    this.friction = (4 * Math.PI * damping) / response;
    return this;
  }

  /**
   * Pulls the spring towards `target`, after `delay` seconds. A `velocity`
   * replaces the velocity it has now, such as at the end of a drag.
   */
  to(
    target: number,
    { delay = 0, velocity }: { delay?: number; velocity?: number } = {},
  ) {
    if (velocity !== undefined) this.velocity = velocity;
    if (delay > 0) {
      this.pending = { target, delay };
    } else {
      this.pending = null;
      this.target = target;
    }
    return this;
  }

  /** Puts the spring at `value`, at rest. */
  snap(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.pending = null;
    return this;
  }

  /** Moves the spring on by `seconds`. */
  step(seconds: number) {
    if (this.pending !== null) {
      this.pending.delay -= seconds;
      if (this.pending.delay <= 0) {
        this.target = this.pending.target;
        this.pending = null;
      }
    }
    if (!this.isMoving) return;
    const steps = Math.max(1, Math.ceil(seconds * STEPS_PER_SECOND));
    const step = seconds / steps;
    for (let index = 0; index < steps; index++) {
      const acceleration =
        -this.stiffness * (this.value - this.target) -
        this.friction * this.velocity;
      this.velocity += acceleration * step;
      this.value += this.velocity * step;
    }
    if (
      this.pending === null &&
      Math.abs(this.value - this.target) < REST_DISTANCE &&
      Math.abs(this.velocity) < REST_SPEED
    ) {
      this.value = this.target;
      this.velocity = 0;
    }
  }

  /** The target it goes to now, or after its delay. */
  get destination() {
    return this.pending?.target ?? this.target;
  }

  get isMoving() {
    return (
      this.pending !== null || this.value !== this.target || this.velocity !== 0
    );
  }
}

/**
 * `value` held between 0 and 1.
 *
 * @internal
 */
export function unit(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * 0 up to `from`, 1 from `to` on, and a smooth step between.
 *
 * @internal
 */
export function smoothstep(from: number, to: number, value: number) {
  const t = unit((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/**
 * The value a share `t` of the way from `from` to `to`.
 *
 * @internal
 */
export function mix(from: number, to: number, t: number) {
  return from + (to - from) * t;
}
