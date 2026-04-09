"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { useScrollFades } from "#src/hooks/use-scroll-fades.ts";
import { scrollX } from "#src/primitives/layout.stylex.ts";
import { color, space } from "#src/tokens.stylex.ts";
import { HorizontalScrollButtons } from "./horizontal-scroll-buttons";

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  ariaLabel: string;
  role?: "list" | "region";
  wrapperCss?: React.Attributes["css"];
  containerCss?: React.Attributes["css"];
  fadeLeftCss?: React.Attributes["css"];
  fadeRightCss?: React.Attributes["css"];
  scrollButtonLeftCss?: React.Attributes["css"];
  scrollButtonRightCss?: React.Attributes["css"];
}

export function HorizontalScrollRow({
  children,
  ariaLabel,
  role = "list",
  wrapperCss,
  containerCss,
  fadeLeftCss,
  fadeRightCss,
  scrollButtonLeftCss,
  scrollButtonRightCss,
}: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftFade, showRightFade } = useScrollFades(scrollRef);

  return (
    <div css={[styles.scrollWrapper, wrapperCss]}>
      <div
        ref={scrollRef}
        css={[
          scrollX.base,
          scrollX.focusRing,
          styles.scrollContainer,
          containerCss,
        ]}
        role={role}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {children}
      </div>
      <div
        css={[styles.fadeEdge, styles.fadeLeft, fadeLeftCss]}
        style={{ opacity: showLeftFade ? 1 : 0 }}
        aria-hidden="true"
      />
      <div
        css={[styles.fadeEdge, styles.fadeRight, fadeRightCss]}
        style={{ opacity: showRightFade ? 1 : 0 }}
        aria-hidden="true"
      />
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
  fadeEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: space._8,
    pointerEvents: "none",
    transition: "opacity 0.2s ease",
  },
  fadeLeft: {
    left: 0,
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundRaisedChannels}, 0), rgba(${color.backgroundRaisedChannels}, 1))`,
  },
  fadeRight: {
    right: 0,
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundRaisedChannels}, 0), rgba(${color.backgroundRaisedChannels}, 1))`,
  },
  scrollButtonLeft: {
    left: space._3,
  },
  scrollButtonRight: {
    right: space._3,
  },
});
