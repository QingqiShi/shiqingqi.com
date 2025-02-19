"use client";

import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { flipAnimationTokens } from "./flip-animation.stylex";

const animationOptions: KeyframeAnimationOptions = {
  duration: 300,
  fill: "none",
  easing: `linear(
      0,
      0.002,
      0.01 3.6%,
      0.034,
      0.074 9.1%,
      0.128 11.4%,
      0.194 13.4%,
      0.271 15%,
      0.544 18.3%,
      0.66 20.6%,
      0.717 22.4%,
      0.765 24.6%,
      0.808 27.3%,
      0.845 30.4%,
      0.883 35.1%,
      0.916 40.6%,
      0.942 47.2%,
      0.963 55%,
      0.979 64%,
      0.991 74.4%,
      0.998 86.4%,
      1
    )`,
};

interface FlipAnimationProps {
  /** If true, animate towards the target element. */
  animateToTarget: boolean;
  /** The id of the target element. */
  targetId: string;
  /** If true, make the containers inline. */
  inline?: boolean;
  /** For style overrides. */
  className?: string;
  /** For style overrides. */
  style?: React.CSSProperties;
}

export function FlipAnimation({
  animateToTarget: isCollapsed,
  targetId: collapseTargetId,
  inline,
  className,
  style,
  children,
}: PropsWithChildren<FlipAnimationProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    const innerEl = innerRef.current;
    if (!containerEl || !innerEl) return;

    const target = document.getElementById(collapseTargetId);
    if (!target) return;

    // Get the target and container rects.
    const targetRect = target.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    // Calculate target scale and translation.
    const scaleX = targetRect.width / containerRect.width;
    const scaleY = targetRect.height / containerRect.height;
    const translateX = targetRect.x - containerRect.x;
    const translateY = targetRect.y - containerRect.y;

    const scaleXVar = flipAnimationTokens.scaleX
      .replace(/^var\(/, "")
      .replace(/\)$/, "");
    const scaleYVar = flipAnimationTokens.scaleY
      .replace(/^var\(/, "")
      .replace(/\)$/, "");

    if (isCollapsed) {
      containerEl.animate(
        [
          {
            [scaleXVar]: 1,
            [scaleYVar]: 1,
            transform: "scale(1, 1) translate(0px, 0px)",
          },
          {
            [scaleXVar]: scaleX,
            [scaleYVar]: scaleY,
            transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
          },
        ],
        animationOptions
      );
    } else {
      containerEl.animate(
        [
          {
            [scaleXVar]: scaleX,
            [scaleYVar]: scaleY,
            transform: `scale(${scaleX}, ${scaleY}) translate(${translateX}px, ${translateY}px)`,
          },
          {
            [scaleXVar]: 1,
            [scaleYVar]: 1,
            transform: "scale(1, 1) translate(0px, 0px)",
          },
        ],
        animationOptions
      );
    }
  }, [collapseTargetId, isCollapsed]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      css={[styles.container, inline && styles.inline]}
    >
      <div ref={innerRef} css={[styles.inner, inline && styles.inline]}>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    transformOrigin: "top left",
    willChange: "transform",
  },
  inner: {
    transform: `scale(calc(1 / ${flipAnimationTokens.scaleX}), calc(1 / ${flipAnimationTokens.scaleY}))`,
    transformOrigin: "top left",
    willChange: "transform",
  },
  inline: {
    display: "inline-block",
  },
});
