interface BarExtent {
  /** Where the bar starts, as a share of the track from its start edge. */
  offset: number;
  /** The bar's length as a share of the track. */
  size: number;
}

/**
 * Places one bar per value on a shared track that holds zero, so a negative
 * value grows from the zero line towards the start and a positive one
 * towards the end.
 */
export function layoutBars(values: readonly number[]): {
  zero: number;
  bars: BarExtent[];
} {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = high - low;
  if (span === 0) {
    return { zero: 0, bars: values.map(() => ({ offset: 0, size: 0 })) };
  }
  const zero = -low / span;
  return {
    zero,
    bars: values.map((value) => {
      const size = Math.abs(value) / span;
      return { offset: value < 0 ? zero - size : zero, size };
    }),
  };
}
