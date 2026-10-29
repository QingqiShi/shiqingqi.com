/** A timestamp such as `deletedAt` after an upsert's flag such as `deleted`: unchanged when the flag is absent. */
export function stampAfter(
  flag: boolean | undefined,
  current: string | null,
  now: string,
) {
  if (flag === undefined) return current;
  return flag ? now : null;
}
