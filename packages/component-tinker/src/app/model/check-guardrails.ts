export interface Guardrail {
  /** The property row the warning belongs beside, where there is one. */
  property?: string;
  text: string;
}

const MIN_CONTRAST = 4.5;
const MIN_GAP_PX = 4;

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): Rgba | undefined {
  const match = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!match) return undefined;
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN))
    return undefined;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
  };
}

function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) =>
    (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return {
    r: mix(top.r, bottom.r),
    g: mix(top.g, bottom.g),
    b: mix(top.b, bottom.b),
    a,
  };
}

function channel(value: number): number {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Rgba): number {
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrastRatio(text: Rgba, background: Rgba): number {
  const lighter = Math.max(luminance(text), luminance(background));
  const darker = Math.min(luminance(text), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** The colour the element's text actually sits on, in the theme now rendered. */
function resolvedBackground(element: Element, root: Element): Rgba | undefined {
  const stack: Rgba[] = [];
  let node: Element | null = element;
  while (node) {
    const background = parseColor(getComputedStyle(node).backgroundColor);
    if (background && background.a > 0) {
      stack.push(background);
      if (background.a === 1) break;
    }
    if (node === root) break;
    node = node.parentElement;
  }
  if (stack.length === 0) return undefined;
  return stack.reduceRight((below, above) => over(above, below));
}

function pixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// `color` inherits, so a layer that holds text in a child span still decides
// what that text reads against.
function showsText(element: Element): boolean {
  return element.textContent.trim().length > 0;
}

/**
 * Warnings the spec fixes: text under 4.5:1 on its background, a radius past
 * half the element's height, and a gap too small to read as one. They never
 * block an edit.
 *
 * Radius and gap are reported only for a value in `changed`, because the
 * component already ships the config's value and the user cannot answer for
 * it here. Contrast is about a pair, so an edit to either half can break a
 * value that was correct, and it is always reported.
 */
export function checkGuardrails(
  element: HTMLElement,
  root: Element,
  changed: ReadonlySet<string>,
): Guardrail[] {
  const warnings: Guardrail[] = [];
  const computed = getComputedStyle(element);

  if (showsText(element)) {
    const text = parseColor(computed.color);
    const background = resolvedBackground(element, root);
    if (text && background) {
      const ratio = contrastRatio(over(text, background), background);
      if (ratio < MIN_CONTRAST) {
        warnings.push({
          property: "color",
          text: `Text contrast is ${ratio.toFixed(2)}:1 against its background, under the 4.5:1 floor.`,
        });
      }
    }
  }

  const radius = pixels(computed.borderTopLeftRadius);
  const halfHeight = element.offsetHeight / 2;
  if (changed.has("borderRadius") && radius > halfHeight && halfHeight > 0) {
    warnings.push({
      property: "borderRadius",
      text: `Radius is ${radius.toFixed(1)}px, past half the element's height (${halfHeight.toFixed(1)}px), so a larger value changes nothing.`,
    });
  }

  for (const axis of ["rowGap", "columnGap"] as const) {
    if (!changed.has("gap") && !changed.has(axis)) continue;
    const gap = pixels(computed[axis]);
    if (gap > 0 && gap < MIN_GAP_PX) {
      warnings.push({
        property: "gap",
        text: `Gap is ${gap.toFixed(1)}px. Below ${String(MIN_GAP_PX)}px the padding no longer reads as larger than the gap.`,
      });
      break;
    }
  }

  return warnings;
}
