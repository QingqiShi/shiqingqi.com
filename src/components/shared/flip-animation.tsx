"use client";

import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { flipAnimationTokens } from "./flip-animation.stylex";

const animationOptions: KeyframeAnimationOptions = {
  duration: 300,
  fill: "none",
  easing: "ease-in-out",
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
    const translateXVar = flipAnimationTokens.translateX
      .replace(/^var\(/, "")
      .replace(/\)$/, "");
    const translateYVar = flipAnimationTokens.translateY
      .replace(/^var\(/, "")
      .replace(/\)$/, "");

    if (isCollapsed) {
      const animation = containerEl.animate(
        [
          {
            [scaleXVar]: 1,
            [scaleYVar]: 1,
            [translateXVar]: "0px",
            [translateYVar]: "0px",
          },
          {
            [scaleXVar]: scaleX,
            [scaleYVar]: scaleY,
            [translateXVar]: `${translateX}px`,
            [translateYVar]: `${translateY}px`,
          },
        ],
        animationOptions
      );
      return () => {
        animation.cancel();
      };
    }

    const animation = containerEl.animate(
      [
        {
          [scaleXVar]: scaleX,
          [scaleYVar]: scaleY,
          [translateXVar]: `${translateX}px`,
          [translateYVar]: `${translateY}px`,
        },
        {
          [scaleXVar]: 1,
          [scaleYVar]: 1,
          [translateXVar]: "0px",
          [translateYVar]: "0px",
        },
      ],
      animationOptions
    );
    return () => {
      animation.cancel();
    };
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
    transform: `scale(${flipAnimationTokens.scaleX}, ${flipAnimationTokens.scaleY}) translate3d(${flipAnimationTokens.translateX}, ${flipAnimationTokens.translateY}, 0px)`,
  },
  inner: {
    transform: `scale(calc(1 / ${flipAnimationTokens.scaleX}), calc(1 / ${flipAnimationTokens.scaleY})) translate3d(0px, 0px, 0px)`,
    transformOrigin: "top left",
    willChange: "transform",
  },
  inline: {
    display: "inline-block",
  },
});
