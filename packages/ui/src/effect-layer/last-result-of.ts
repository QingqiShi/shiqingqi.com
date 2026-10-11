/**
 * Keeps the last result, and computes again only for different arguments.
 *
 * @internal
 */
export function lastResultOf<Args extends readonly unknown[], Result>(
  compute: (...args: Args) => Result,
) {
  let last: { args: Args; result: Result } | null = null;
  return (...args: Args) => {
    if (last === null || args.some((arg, index) => arg !== last?.args[index])) {
      last = { args, result: compute(...args) };
    }
    return last.result;
  };
}
