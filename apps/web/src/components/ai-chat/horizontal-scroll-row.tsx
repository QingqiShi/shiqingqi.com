"use client";

import * as stylex from "@stylexjs/stylex";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import type { StyleProp } from "@tuja/ui/css-prop-types";
import { useScrollMask } from "@tuja/ui/hooks/use-scroll-mask";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useRef } from "react";
import { HorizontalScrollButtons } from "./horizontal-scroll-buttons";

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  ariaLabel: string;
  role?: "list" | "region";
  wrapperCss?: StyleProp;
  containerCss?: StyleProp;
  scrollButtonLeftCss?: StyleProp;
  scrollButtonRightCss?: StyleProp;
}

export function HorizontalScrollRow({
  children,
  ariaLabel,
  role = "list",
  wrapperCss,
  containerCss,
  scrollButtonLeftCss,
  scrollButtonRightCss,
}: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Kept in the consumer (not left to ScrollMask) because the scroll-to-page
  // buttons need the same state; ScrollMask runs in controlled mode so there is
  // a single set of observers on the element.
  const { showStartMask: showLeftMask, showEndMask: showRightMask } =
    useScrollMask(scrollRef, "horizontal");

  return (
    <div css={[styles.scrollWrapper, wrapperCss]}>
      <ScrollMask
        ref={scrollRef}
        orientation="horizontal"
        depth={space._8}
        showStartMask={showLeftMask}
        showEndMask={showRightMask}
        role={role}
        aria-label={ariaLabel}
        tabIndex={0}
        contentCss={[
          scrollX.base,
          scrollX.focusRing,
          styles.scrollContainer,
          containerCss,
        ]}
      >
        {children}
      </ScrollMask>
      <HorizontalScrollButtons
        scrollRef={scrollRef}
        showLeft={showLeftMask}
        showRight={showRightMask}
        leftCss={[styles.scrollButtonLeft, scrollButtonLeftCss]}
        rightCss={[styles.scrollButtonRight, scrollButtonRightCss]}
      />
    </div>
  );
}

const styles = stylex.create({
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${space._3})`,
    marginRight: `calc(-1 * ${space._3})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    scrollSnapType: "x mandatory",
    padding: space._3,
    scrollPaddingLeft: space._3,
    scrollPaddingRight: space._3,
  },
  scrollButtonLeft: {
    left: space._3,
  },
  scrollButtonRight: {
    right: space._3,
  },
});
