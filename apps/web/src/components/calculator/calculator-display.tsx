"use client";
import * as stylex from "@stylexjs/stylex";
import { ScrollFade } from "@tuja/ui/components/scroll-fade";
import { space } from "@tuja/ui/tokens.stylex";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import type { Token } from "./types.ts";

interface CalculatorDisplayProps {
  tokens: Token[];
  currentToken: Token;
}

function formatTokenValue(token: Token, errorLabel: string): string {
  return Number.isNaN(token.value) ? errorLabel : String(token.value);
}

function updateFontSize(
  container: HTMLElement,
  text: HTMLElement,
  setIsScrollable: (scrollable: boolean) => void,
) {
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
  text.style.fontSize = `${String(maxSize)}px`;
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

  text.style.fontSize = `${String(finalSize)}px`;

  // Content is scrollable when at minimum font size and still overflowing
  const textOverflows = text.scrollWidth > availableWidth;
  setIsScrollable(finalSize <= minSize && textOverflows);
}

export function CalculatorDisplay({
  tokens,
  currentToken,
}: CalculatorDisplayProps) {
  const errorLabel = t({ en: "Error", zh: "错误" });
  const displayText = [...tokens, currentToken]
    .map((token) => formatTokenValue(token, errorLabel))
    .join(" ");

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  // Observe container resizes (e.g. viewport changes) — created once.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const observer = new ResizeObserver(() => {
      updateFontSize(container, text, setIsScrollable);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Recalculate font size when the display text changes.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    updateFontSize(container, text, setIsScrollable);
  }, [displayText]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isScrollable) return;

    // Scroll to end when content changes and is scrollable
    container.scrollLeft = container.scrollWidth;
  }, [displayText, isScrollable]);

  return (
    <div css={styles.wrapper}>
      <ScrollFade
        ref={containerRef}
        orientation="horizontal"
        css={[styles.container, isScrollable && styles.scrollable]}
        role="status"
        aria-live="polite"
      >
        <span ref={textRef} css={styles.text}>
          {displayText}
        </span>
      </ScrollFade>
    </div>
  );
}

const styles = stylex.create({
  wrapper: {
    height: "20%",
    position: "relative",
  },
  container: {
    // ScrollFade owns the overflow (auto on the scroll axis); the height and
    // end-alignment stay here.
    height: "100%",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingInline: space._3,
  },
  scrollable: {
    // Once the text can no longer shrink to fit, align it to the start so the
    // most recent tokens are what scrolls into view at the end.
    justifyContent: "flex-start",
  },
  text: {
    display: "inline-flex",
    whiteSpace: "nowrap",
    lineHeight: "0.9em",
  },
});
