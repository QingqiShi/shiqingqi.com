/** A change of more than this share of the last value asks for a second look. */
const LARGE_CHANGE_SHARE = 0.25;

export interface ValuationChange {
  changeMinor: number;
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
    isLarge: share !== null && Math.abs(share) > LARGE_CHANGE_SHARE,
  };
}
