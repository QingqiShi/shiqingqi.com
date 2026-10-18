"use client";

import { use, type ReactNode } from "react";
import {
  EffectCarrierContext,
  EffectContainedContext,
} from "./effect-carrier-context.ts";
import {
  VIEWPORT_BOTTOM_CARRIER,
  VIEWPORT_CARRIER,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";
import type { EffectSticky } from "./use-effect-sticky.ts";

export interface EffectCarrierProps {
  /**
   * What the content moves with. `"viewport"` for content that is fixed to
   * the viewport, `"viewport-bottom"` for content that is fixed to the
   * viewport's bottom edge, or the result of `useEffectSticky` for content
   * in a sticky box. `"contained"` for a box that holds the fixed and sticky
   * boxes inside it, such as a preview stage with a `transform`: the content
   * then moves with the carrier around the box, whatever it declares inside.
   *
   * @zh 内容随什么移动。固定在视口上的内容用 `"viewport"`，固定在视口底边的内容用 `"viewport-bottom"`，粘性盒子里的内容用 `useEffectSticky` 的返回值。`"contained"` 用于自己容纳内部固定与粘性盒子的盒子，例如带 `transform` 的预览舞台：此时内容随盒子外的载体移动，无论内部声明了什么。
   */
  value: "viewport" | "viewport-bottom" | "contained" | EffectSticky;
  /**
   * The content. Each effect hook in it, at any depth, draws its effects on
   * this Effect carrier, also when its element is portalled out, until an
   * `EffectCarrier` inside declares another.
   *
   * @zh 内容。其中任意层级的效果 hook 都在这个效果载体上绘制效果，即使它的元素被传送到外面；直到内部的另一个 `EffectCarrier` 声明别的载体为止。
   */
  children: ReactNode;
}

/**
 * Declares the Effect carrier of the effect hooks inside it: what their
 * effects move with. The effect layer draws them on the `<canvas>` element
 * of that carrier, so a scroll moves the effects with the content and the
 * layer does not measure them again. Content with no `EffectCarrier` above
 * it moves with the page. Wrap content that is fixed to the viewport:
 *
 * ```tsx
 * <nav css={styles.fixedBar}>
 *   <EffectCarrier value="viewport">{children}</EffectCarrier>
 * </nav>
 * ```
 *
 * A component never adds a `<canvas>` element of its own for its effects.
 * In development, the layer warns in the console when a declaration does
 * not agree with where the browser lays an element out.
 */
export function EffectCarrier({ value, children }: EffectCarrierProps) {
  const isContained = use(EffectContainedContext);
  if (value === "contained") {
    return <EffectContainedContext value>{children}</EffectContainedContext>;
  }
  if (isContained) {
    return children;
  }
  const declared: EffectCarrierRef =
    value === "viewport"
      ? VIEWPORT_CARRIER
      : value === "viewport-bottom"
        ? VIEWPORT_BOTTOM_CARRIER
        : value.carrier;
  return (
    <EffectCarrierContext value={declared}>{children}</EffectCarrierContext>
  );
}
