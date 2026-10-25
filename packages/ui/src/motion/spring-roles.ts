/**
 * How a spring moves, in the form the solver takes. `response` is the time,
 * in seconds, of one swing of the undamped spring: 2π / ω, where
 * ω = √(stiffness / mass). `dampingRatio` is 1 for a spring that settles with
 * no overshoot, and less than 1 for one that overshoots.
 *
 * A spring has no duration: how long a motion takes comes from the spring,
 * the distance and the start velocity.
 *
 * @internal
 */
export interface Spring {
  readonly response: number;
  readonly dampingRatio: number;
}

/**
 * The one spring of the system. A role gives it a mass: a heavier role moves
 * slower, with the same bounce, because the damping ratio stays the
 * system's.
 *
 * @internal
 */
export interface SystemSpring {
  readonly stiffness: number;
  readonly dampingRatio: number;
}

/**
 * How heavy a role is, for the system spring. `dampingRatio` replaces the
 * system's, only so that each motion keeps the spring it has today until
 * the roles merge.
 *
 * @internal
 */
export interface SpringRole {
  readonly mass: number;
  readonly dampingRatio?: number;
}

/**
 * A move of a fixed length, for a motion under reduced motion only, such as
 * a short fade in place of a slide. `easing` maps the share of the time to
 * the share of the way, and is linear when it is left out.
 *
 * @internal
 */
export interface Tween {
  readonly duration: number;
  readonly easing?: (t: number) => number;
}

/**
 * At mass 1, the spring that `easing.spring` samples over 500ms.
 *
 * @internal
 */
export const systemSpring: SystemSpring = {
  stiffness: 483.6,
  dampingRatio: 0.7,
};

/**
 * The roles of the package, with masses that give each motion the speed it
 * has today.
 *
 * @internal
 */
export const springRoles = {
  css: { mass: 1 },
  columnPush: { mass: 3.842 },
  stackPush: { mass: 3.062, dampingRatio: 1 },
  fold: { mass: 3.062, dampingRatio: 0.88 },
  flight: { mass: 2.592, dampingRatio: 0.8 },
  move: { mass: 2.161, dampingRatio: 0.9 },
  lift: { mass: 3.062, dampingRatio: 0.86 },
} as const satisfies Record<string, SpringRole>;

/**
 * The spring of `role` on the system spring.
 *
 * @internal
 */
export function springOf(role: SpringRole): Spring {
  const omega = Math.sqrt(systemSpring.stiffness / role.mass);
  return {
    response: (2 * Math.PI) / omega,
    dampingRatio: role.dampingRatio ?? systemSpring.dampingRatio,
  };
}
