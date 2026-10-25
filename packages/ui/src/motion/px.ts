/**
 * CSS properties, by their CSS names (`background-color`, not
 * `backgroundColor`), with their values.
 *
 * @internal
 */
export type Styles = Readonly<Record<string, string>>;

/** @internal */
export function px(value: number) {
  return `${value.toFixed(2)}px`;
}
