/**
 * CSS properties, by their CSS names (`background-color`, not
 * `backgroundColor`), with their values.
 */
export type Styles = Readonly<Record<string, string>>;

/** `value` as a CSS length in px, for a pose. */
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
