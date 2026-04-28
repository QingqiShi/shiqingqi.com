import * as stylex from "@stylexjs/stylex";
import type { CSSProperties, ReactNode, Ref } from "react";

interface FixedContainerContentProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A wrapper component that creates a new render layer to prevent flashing of
 * fixed-position elements during view transitions.
 *
 * This component uses `will-change: transform` to force Chrome to create a
 * separate compositing layer, which works around a Chrome bug that causes
 * fixed elements to flash during view transitions.
 *
 * @example
 * ```tsx
 * <div style={{ position: 'fixed' }}>
 *   <FixedContainerContent>
 *     <Header />
 *   </FixedContainerContent>
 * </div>
 * ```
 */
export function FixedContainerContent({
  children,
  className,
  style,
  ref,
}: FixedContainerContentProps) {
  return (
    <div ref={ref} css={styles.container} className={className} style={style}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  container: {
    willChange: "transform",
  },
});
