import { relativeLuminance } from "./relative-luminance.ts";

/** WCAG 2.x contrast ratio: (L1 + 0.05) / (L2 + 0.05), L1 the lighter. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}
