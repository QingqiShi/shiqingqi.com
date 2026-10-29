interface SeriesSummary {
  first: number;
  last: number;
  min: number;
  minIndex: number;
  max: number;
  maxIndex: number;
  /** The mean of the points. */
  average: number;
}

/** The first, last, lowest, highest and mean point of a series; the latest extreme wins a tie. */
export function summariseSeries(values: Float64Array): SeriesSummary {
  if (values.length === 0) {
    return {
      first: 0,
      last: 0,
      min: 0,
      minIndex: -1,
      max: 0,
      maxIndex: -1,
      average: 0,
    };
  }
  let minIndex = 0;
  let maxIndex = 0;
  let sum = 0;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    sum += value;
    if (value <= values[minIndex]) minIndex = index;
    if (value >= values[maxIndex]) maxIndex = index;
  }
  return {
    first: values[0],
    last: values[values.length - 1],
    min: values[minIndex],
    minIndex,
    max: values[maxIndex],
    maxIndex,
    average: sum / values.length,
  };
}
