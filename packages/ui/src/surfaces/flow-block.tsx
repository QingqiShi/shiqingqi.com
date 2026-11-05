"use client";

import * as stylex from "@stylexjs/stylex";
import type { HTMLAttributes, Ref } from "react";
import { mergeRefs } from "../merge-refs.ts";
import {
  useFlowBlock,
  type FlowSurfaceOption,
} from "../motion/use-flow-block.tsx";
import type { StyleProp } from "../types.ts";

type FlowBlockProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> &
  FlowSurfaceOption & {
    /**
     * The element to render.
     *
     * @default "div"
     * @zh 要渲染的元素。
     */
    as?: "div" | "section" | "li" | "hr" | "nav";
    /**
     * StyleX styles of the element.
     *
     * @zh 元素的 StyleX 样式。
     */
    css?: StyleProp;
    /**
     * Ref to the rendered element.
     *
     * @zh 指向渲染元素的 ref。
     */
    ref?: Ref<HTMLElement>;
  };

/**
 * A box that moves as one when a `Disclosure` above it opens or closes. Only
 * the blocks move, so a box in the flow under a `Disclosure` is in one of these
 * or in a component that is one: `Card`, `List`, `Section`, `Divider`,
 * `Disclosure` and each sticky box.
 */
export function FlowBlock({
  as = "div",
  surface = false,
  css,
  ref,
  children,
  ...restProps
}: FlowBlockProps) {
  const { ref: flowRef, skin } = useFlowBlock({ surface });
  const props = { ...restProps, ...stylex.props(css) };
  const merged = mergeRefs<HTMLElement>(ref, flowRef);
  if (as === "hr") return <hr {...props} ref={merged} />;
  const Tag = as;
  return (
    <Tag {...props} ref={merged}>
      {children}
      {skin}
    </Tag>
  );
}
