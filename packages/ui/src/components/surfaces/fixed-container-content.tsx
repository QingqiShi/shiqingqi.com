import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../types.ts";

interface FixedContainerContentProps {
  /**
   * Content to isolate on its own compositing layer.
   *
   * @zh 需要隔离到独立合成层的内容。
   */
  children: ReactNode;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh StyleX 覆盖样式，最后合并，使调用方可以覆盖默认样式。
   */
  css?: StyleProp;
  /**
   * Ref to the layer wrapper element.
   *
   * @zh 指向该层包装元素的 ref。
   */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Isolates content on its own compositing layer via `will-change: transform`,
 * working around a Chrome bug that flashes fixed-position elements during
 * view transitions.
 */
export function FixedContainerContent({
  children,
  css,
  ref,
}: FixedContainerContentProps) {
  return (
    <div ref={ref} css={[styles.container, css]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  container: {
    willChange: "transform",
  },
});
