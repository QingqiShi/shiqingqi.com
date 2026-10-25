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

/**
 * Writes `styles` inline on `element`. An empty value takes the property off.
 *
 * @internal
 */
export function writeStyles(element: HTMLElement | SVGElement, styles: Styles) {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value);
  }
}
