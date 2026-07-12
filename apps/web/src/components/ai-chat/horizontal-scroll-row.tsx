"use client";

import * as stylex from "@stylexjs/stylex";
import { ScrollFade } from "@tuja/ui/components/scroll-fade";
import { useScrollFades } from "@tuja/ui/hooks/use-scroll-fades";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useRef } from "react";
import { HorizontalScrollButtons } from "./horizontal-scroll-buttons";

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  ariaLabel: string;
  role?: "list" | "region";
  wrapperCss?: React.Attributes["css"];
  containerCss?: React.Attributes["css"];
  scrollButtonLeftCss?: React.Attributes["css"];
  scrollButtonRightCss?: React.Attributes["css"];
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
  // Kept in the consumer (not left to ScrollFade) because the scroll-to-page
  // buttons need the same fade state; ScrollFade runs in controlled mode so
  // there is a single set of observers on the element.
  const { showStartFade: showLeftFade, showEndFade: showRightFade } =
    useScrollFades(scrollRef, "horizontal");

  return (
    <div css={[styles.scrollWrapper, wrapperCss]}>
      <ScrollFade
        ref={scrollRef}
        orientation="horizontal"
        fadeSize={space._8}
        showStartFade={showLeftFade}
        showEndFade={showRightFade}
        role={role}
        aria-label={ariaLabel}
        tabIndex={0}
        css={[
          scrollX.base,
          scrollX.focusRing,
          styles.scrollContainer,
          containerCss,
        ]}
      >
        {children}
      </ScrollFade>
      <HorizontalScrollButtons
        scrollRef={scrollRef}
        showLeft={showLeftFade}
        showRight={showRightFade}
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
