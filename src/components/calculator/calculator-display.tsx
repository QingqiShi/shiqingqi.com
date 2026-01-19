"use client";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { color, space } from "#src/tokens.stylex.ts";
import type { Token } from "./types.ts";

const SCROLL_THRESHOLD = 1;

interface CalculatorDisplayProps {
  tokens: Token[];
  currentToken: Token;
}

function formatTokenValue(token: Token): string {
  return Number.isNaN(token.value) ? "Error" : String(token.value);
}

export function CalculatorDisplay({
  tokens,
  currentToken,
}: CalculatorDisplayProps) {
  const displayText = [...tokens, currentToken].map(formatTokenValue).join(" ");

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const updateFontSize = () => {
      const { height } = container.getBoundingClientRect();
      // Use height as the basis for font size - max is 80% of height, min is 35%
      const maxSize = height * 0.8;
      const minSize = height * 0.35;
      // Account for padding when measuring available width
      const paddingX =
        parseFloat(getComputedStyle(container).paddingLeft) +
        parseFloat(getComputedStyle(container).paddingRight);
      const availableWidth = container.clientWidth - paddingX;

      // Measure text width at max size to calculate scaling factor
      text.style.fontSize = `${maxSize}px`;
      const textWidthAtMax = text.scrollWidth;

      let finalSize: number;
      if (textWidthAtMax <= availableWidth) {
        // Text fits at max size
        finalSize = maxSize;
      } else {
        // Calculate the font size needed to fit, clamped to min
        const scaleFactor = availableWidth / textWidthAtMax;
        finalSize = Math.max(maxSize * scaleFactor, minSize);
      }

      text.style.fontSize = `${finalSize}px`;

      // Content is scrollable when at minimum font size and still overflowing
      const textOverflows = text.scrollWidth > availableWidth;
      setIsScrollable(finalSize <= minSize && textOverflows);
    };

    const observer = new ResizeObserver(updateFontSize);
    observer.observe(container);
    updateFontSize();

    return () => observer.disconnect();
  }, [displayText]);

  // Update gradient visibility based on scroll position
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateGradients = () => {
      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      setShowLeftGradient(scrollLeft > SCROLL_THRESHOLD);
      setShowRightGradient(scrollLeft < maxScroll - SCROLL_THRESHOLD);
    };

    container.addEventListener("scroll", updateGradients);
    updateGradients();

    return () => container.removeEventListener("scroll", updateGradients);
  }, [isScrollable]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isScrollable) return;

    // Scroll to end when content changes and is scrollable
    container.scrollLeft = container.scrollWidth;
  }, [displayText, isScrollable]);

  return (
    <div css={styles.wrapper}>
      <div
        ref={containerRef}
        css={[styles.container, isScrollable && styles.scrollable]}
        role="status"
        aria-live="polite"
      >
        <span ref={textRef} css={styles.text}>
          {displayText}
        </span>
      </div>
      {isScrollable && (
        <>
          <div
            css={[
              styles.gradient,
              styles.leftGradient,
              showLeftGradient && styles.visible,
            ]}
          />
          <div
            css={[
              styles.gradient,
              styles.rightGradient,
              showRightGradient && styles.visible,
            ]}
          />
        </>
      )}
    </div>
  );
}

const styles = stylex.create({
  wrapper: {
    height: "20%",
    position: "relative",
  },
  container: {
    height: "100%",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingInline: space._3,
    overflow: "hidden",
  },
  scrollable: {
    overflowX: "auto",
    justifyContent: "flex-start",
  },
  text: {
    display: "inline-flex",
    whiteSpace: "nowrap",
    lineHeight: "0.9em",
  },
  gradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    // Wide enough to cover padding + fade zone
    width: `calc(${space._3} + ${space._5})`,
    pointerEvents: "none",
    opacity: 0,
    transition: "opacity 200ms ease-out",
  },
  leftGradient: {
    left: 0,
    // Solid color for padding area, then fade
    backgroundImage: `linear-gradient(to right, ${color.backgroundRaised} ${space._3}, transparent)`,
  },
  rightGradient: {
    right: 0,
    // Solid color for padding area, then fade
    backgroundImage: `linear-gradient(to left, ${color.backgroundRaised} ${space._3}, transparent)`,
  },
  visible: {
    opacity: 1,
  },
});
