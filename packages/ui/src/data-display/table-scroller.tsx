"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { scrollbar, scrollX } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import type { StyleProp } from "../types.ts";

interface TableScrollerProps {
  /** The id of the caption that names the region. */
  labelledBy: string;
  /** The rows also scroll on the block axis, under a sticky head. */
  scrollsBlock: boolean;
  containerCss?: StyleProp;
  children: ReactNode;
}

/**
 * The scroll region of a `Table`. When the rows scroll on the block axis, it
 * is a Scroll region of the effect layer, so the effects in the rows move
 * with that scroll.
 *
 * @internal
 */
export function TableScroller({
  labelledBy,
  scrollsBlock,
  containerCss,
  children,
}: TableScrollerProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <ScrollMask
      ref={scrollsBlock ? scroller : undefined}
      orientation="horizontal"
      role="region"
      aria-labelledby={labelledBy}
      tabIndex={0}
      css={[corner.radius_2, styles.container, containerCss]}
      contentCss={[
        scrollX.base,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.scroller,
        scrollsBlock && styles.scrollBlock,
      ]}
    >
      {scrollsBlock ? (
        <div ref={content} css={styles.regionContent}>
          <EffectCarrier value={region}>{children}</EffectCarrier>
        </div>
      ) : (
        children
      )}
    </ScrollMask>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: "100%",
  },
  // The head is always positioned and raised over the rows. The scroller keeps
  // that raise inside itself, so the Scroll mask blurs the head too.
  scroller: {
    isolation: "isolate",
  },
  // A sticky head sticks to the scroller, so the rows have to scroll there.
  scrollBlock: {
    overflowY: "auto",
  },
  // The box that holds the <canvas> elements of the Scroll region. It is as
  // wide as the table, which can be wider than the scroller.
  regionContent: {
    position: "relative",
    inlineSize: "fit-content",
    minInlineSize: "100%",
  },
});
