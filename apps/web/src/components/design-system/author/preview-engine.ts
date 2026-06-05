// Live-preview primitives. The pure helpers (parseVarName / parseLength) are
// unit-tested; the DOM helpers wrap setProperty / getComputedStyle and run
// client-side only.

/** Extract the custom-property name from a `var(--x)` reference, or null. */
export function parseVarName(ref: string): string | null {
  const match = /^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/.exec(ref);
  return match?.[1] ?? null;
}

export interface LengthParts {
  value: string;
  unit: string;
}

/** Split a length like "1.25rem" into its number and unit, with a fallback unit. */
export function parseLength(input: string, fallbackUnit: string): LengthParts {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i.exec(input.trim());
  if (!match) return { value: input.trim(), unit: "" };
  return { value: match[1], unit: match[2] === "" ? fallbackUnit : match[2] };
}

export function applyOverride(
  scope: HTMLElement,
  varName: string,
  value: string,
): void {
  scope.style.setProperty(varName, value);
}

export function clearOverride(scope: HTMLElement, varName: string): void {
  scope.style.removeProperty(varName);
}

/** Read a scalar token's resolved value (length/number) off the scope element. */
export function readScalar(scope: HTMLElement, varName: string): string {
  return getComputedStyle(scope).getPropertyValue(varName).trim();
}

/**
 * Read a color token's resolved value via a probe element. Custom properties
 * don't resolve to a computed color on their own, so we set `color: var(--x)`
 * on a throwaway element inside the scope and read the normalized rgb()/rgba().
 */
export function readColor(probe: HTMLElement, ref: string): string {
  probe.style.color = ref;
  return getComputedStyle(probe).color;
}
