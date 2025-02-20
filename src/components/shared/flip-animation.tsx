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

    if (isCollapsed) {
      const animation = containerEl.animate(
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
      return () => {
        animation.cancel();
      };
    }

    const animation = containerEl.animate(
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
