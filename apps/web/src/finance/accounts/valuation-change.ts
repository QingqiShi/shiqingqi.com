/** A change of more than this share of the last value asks for a second look. */
const LARGE_CHANGE_SHARE = 0.25;

export interface ValuationChange {
  changeMinor: number;
  /** The change as a share of the last value; null when the last value is 0. */
  share: number | null;
  isLarge: boolean;
}

/** How far a typed value moves from the last one, both as shown in the field. */
export function valuationChange(
  current: number,
  next: number,
): ValuationChange {
  const changeMinor = next - current;
  const share = current === 0 ? null : changeMinor / Math.abs(current);
  return {
    changeMinor,
    share,
    isLarge: share !== null && Math.abs(share) > LARGE_CHANGE_SHARE,
  };
}
