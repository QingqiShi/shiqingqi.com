import type { ReactNode } from "react";

/**
 * Shared SVG frame for Callout's built-in variant icons. Matches the Phosphor
 * icon metrics (256 viewBox, currentColor strokes, 1em box) so a caller can
 * swap in a Phosphor icon without a size jump.
 *
 * @internal
 */
export function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="none">
      {children}
    </svg>
  );
}
