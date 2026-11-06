"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { mergeRefs } from "../merge-refs.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { scrollbar, scrollX } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { observeChildren } from "../surfaces/observe-children.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import { border } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { tableTokens } from "./table.stylex.ts";

interface TableScrollerProps {
  /** The id of the caption that names the region. */
  labelledBy: string;
  /** The rows also scroll on the block axis, under a sticky head. */
  scrollsBlock: boolean;
  /** The first column sticks at the start edge. */
  stickyColumn: boolean;
  containerCss?: StyleProp;
  contentCss?: StyleProp;
  children: ReactNode;
}

/**
 * The scroll region of a `Table`. Only while the table overflows it is it a
 * named region and a tab stop, so the keyboard can scroll it; a table that
 * fits adds no tab stop. When the rows scroll on the block axis, it is a
 * Scroll region of the effect layer, so the effects in the rows move with
 * that scroll. While the table overflows, the region gives the width of its
 * visible box to the table as `tableTokens.scrollport`. A sticky first
 * column marks its edge while the other columns pass under it, in place of
 * the start edge's blur.
 *
 * @internal
 */
export function TableScroller({
  labelledBy,
  scrollsBlock,
  stickyColumn,
  containerCss,
  contentCss,
  children,
}: TableScrollerProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollport, setScrollport] = useState<number | null>(null);
  const [isScrolledUnder, setIsScrolledUnder] = useState(false);

  useEffect(() => {
    const element = scrollerRef.current;
    if (element === null) return;
    return observeChildren(
      element,
      () => {
        const overflowsInline = element.scrollWidth > element.clientWidth;
        setIsOverflowing(
          overflowsInline ||
            (scrollsBlock && element.scrollHeight > element.clientHeight),
        );
        setScrollport(overflowsInline ? element.clientWidth : null);
      },
      { includeContainer: true },
    );
  }, [scrollsBlock]);

  return (
    <ScrollMask
      ref={mergeRefs(scrollerRef, scrollsBlock ? scroller : undefined)}
      orientation="horizontal"
      startMask={!stickyColumn}
      onScroll={
        stickyColumn
          ? (event) => {
              setIsScrolledUnder(event.currentTarget.scrollLeft !== 0);
            }
          : undefined
      }
      {...(isOverflowing && {
        tabIndex: 0,
        role: "region",
        "aria-labelledby": labelledBy,
      })}
      css={[corner.radius_2, styles.container, containerCss]}
      contentCss={[
        scrollX.base,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.scroller,
        scrollsBlock && styles.scrollBlock,
        scrollport !== null && styles.scrollport(scrollport),
        isScrolledUnder && styles.scrolledUnder,
        contentCss,
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
  // A sticky column marks the edge that the other columns pass under.
  scrolledUnder: {
    [tableTokens.columnEdge]: `inset calc(-1 * ${border.size_1}) 0 0 ${color.border}`,
  },
  scrollport: (size: number) => ({
    [tableTokens.scrollport]: `${String(size)}px`,
  }),
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
