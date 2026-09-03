import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../style-prop.ts";

interface FixedContainerContentProps {
  /** Content to isolate on its own compositing layer. */
  children: ReactNode;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the layer wrapper element. */
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
