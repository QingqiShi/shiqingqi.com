function distance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + cost,
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

/** The closest of `candidates` to `input`, for a "did you mean" message. */
export function nearestName(
  input: string,
  candidates: readonly string[],
): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  const needle = input.toLowerCase();
  for (const candidate of candidates) {
    const score = distance(needle, candidate.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  if (best === undefined) return undefined;
  return bestScore <= Math.max(3, Math.ceil(input.length / 2))
    ? best
    : undefined;
}

export function withSuggestion(
  message: string,
  input: string,
  candidates: readonly string[],
): string {
  const nearest = nearestName(input, candidates);
  return nearest ? `${message} Did you mean "${nearest}"?` : message;
}
