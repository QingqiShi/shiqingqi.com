/**
 * How a spring moves, in the form the solver takes. `response` is the time,
 * in seconds, of one swing of the undamped spring: 2π / ω, where
 * ω = √(stiffness / mass). `dampingRatio` is 1 for a spring that settles with
 * no overshoot, and less than 1 for one that overshoots.
 *
 * A spring has no duration: how long a motion takes comes from the spring,
 * the distance and the start velocity.
 */
export interface Spring {
  readonly response: number;
  readonly dampingRatio: number;
}

/**
 * The one spring of the system. Its stiffness and its damping ratio are the
 * same for every motion; only the mass of what moves changes.
 */
export interface SystemSpring {
  readonly stiffness: number;
  readonly dampingRatio: number;
}

/**
 * How heavy a thing that moves is, on the system spring. A heavier role
 * moves slower, with the same bounce, because the damping ratio stays the
 * system's.
 */
export interface SpringRole {
  readonly mass: number;
}

/**
 * A move of a fixed length, such as a fade, or a short fade in place of a
 * slide under reduced motion. `easing` maps the share of the time to the
 * share of the way, and is linear when it is left out.
 */
export interface Tween {
  readonly duration: number;
  readonly easing?: (t: number) => number;
}

/** The spring of every motion in the system. `easing.spring` samples it at mass 1. */
export const systemSpring: SystemSpring = {
  stiffness: 483.6,
  dampingRatio: 0.7,
};

/**
 * The masses of the things that move in the package, from the lightest. A
 * small part moves faster than a big one, and each comes to rest soon after
 * its bounce.
 */
export const springRoles = {
  /** A popover, a menu, a toast, a Sheet's card, a screen that rises, a control. */
  surface: { mass: 1 },
  /** The on fill as it rises through a Switch's track. */
  switchFill: { mass: 1.4 },
  /** A page that a split view pushes over the one before it. */
  stackPush: { mass: 1.6 },
  /** An element that moves to its new place in the layout. */
  move: { mass: 1.8 },
  /** A Shared element as it flies to its new form. */
  flight: { mass: 1.9 },
  /** A column that a split view pushes in beside the others. */
  columnPush: { mass: 2 },
  /** A Sheet's card as it grows out of a row and shrinks back into it. */
  lift: { mass: 2 },
  /** A split view's sidebar as it folds to its strip or opens. */
  fold: { mass: 2.2 },
  /** The beam of a Black hole as it turns to its aim. */
  aim: { mass: 2.4 },
} as const satisfies Record<string, SpringRole>;

/** The spring of `role` on the system spring. */
export function springOf(role: SpringRole): Spring {
  const omega = Math.sqrt(systemSpring.stiffness / role.mass);
  return {
    response: (2 * Math.PI) / omega,
    dampingRatio: systemSpring.dampingRatio,
  };
}
