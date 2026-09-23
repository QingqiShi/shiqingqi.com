export interface ProbedViewports {
  /** The large viewport height (`100lvh`), in CSS px. */
  large: number;
  /** The small viewport height (`100svh`), in CSS px. */
  small: number;
}

export interface ProbeReading {
  /** The large-viewport probe's height, or 0 where `lvh` is missing. */
  large: number;
  /** The small-viewport probe's height, or 0 where `svh` is missing. */
  small: number;
  innerHeight: number;
}

/**
 * The large and small viewport heights from the probes. Where the browser
 * has no `lvh` or `svh`, the tallest and the shortest inner height seen stand
 * in. Start from `{ large: 0, small: 0 }`.
 */
export function resolveProbes(
  previous: ProbedViewports,
  { large, small, innerHeight }: ProbeReading,
): ProbedViewports {
  return {
    large: large > 0 ? large : Math.max(previous.large, innerHeight),
    small:
      small > 0 ? small : Math.min(previous.small || Infinity, innerHeight),
  };
}
