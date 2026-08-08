import type { Ref } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { progressiveBlur } from "./progressive-blur.stylex.ts";

interface ProgressiveBlurProps {
  /**
   * Strongest blur radius, reached at the origin. Capped at 40px, because five
   * full-viewport blurs are composited on every frame the page behind them
   * moves — a small popover and a full-width sheet do not want the same radius,
   * but neither wants an unbounded one.
   */
  radius?: string;
  /** Distance from the origin at which the page is sharp again. */
  reach?: string;
  /**
   * Where the falloff is centred, as a `background-position`-style pair.
   * Defaults to the middle of the viewport; pass the floating element's own
   * centre so the blur is strongest where the attention is.
   */
  originX?: string;
  originY?: string;
  /** Escape hatch — most usefully for the stacking plane. */
  css?: StyleProp;
  /**
   * The origin is a static prop, so an element that only knows where it landed
   * at runtime writes `--ds-blur-x` / `--ds-blur-y` onto the node instead.
   */
  ref?: Ref<HTMLDivElement>;
}

/**
 * The page blurred around whatever floats, in place of dimming it.
 *
 * Renders behind the floating element and blurs everything the element does
 * not cover, strongest nearest the origin and easing back to sharp further out.
 * The blur belongs to the page rather than to the element: the element paints
 * its own opaque surface over the top and keeps a crisp edge, which is what
 * tells a visitor what dismisses it.
 *
 * Inert by design — it never takes the pointer, so the element's own backdrop
 * keeps whatever dismissal behaviour it had.
 */
export function ProgressiveBlur({
  radius = "16px",
  reach = "62vmax",
  originX = "50%",
  originY = "50%",
  css,
  ref,
}: ProgressiveBlurProps) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      css={[
        progressiveBlur.root,
        progressiveBlur.vars(radius, reach, originX, originY),
        css,
      ]}
    >
      <div css={progressiveBlur.band_1} />
      <div css={progressiveBlur.band_2} />
      <div css={progressiveBlur.band_3} />
      <div css={progressiveBlur.band_4} />
      <div css={progressiveBlur.band_5} />
    </div>
  );
}
