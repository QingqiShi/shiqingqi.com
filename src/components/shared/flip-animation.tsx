"use client";

import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";

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

/**
 * Animates an element from its natural state to a target state using the FLIP (First, Last, Invert, Play) technique.
 *
 * The process works as follows:
 * 1. Measure the bounding rectangles of the element in its natural state (First) and target state (Last).
 * 2. Compute the inverse transform (Invert) needed to bridge the gap between these two states.
 * 3. Play the animation by interpolating between the states.
 *
 * To create a clipping effect, the inner content is inversely scaled during the animation.
 * However, simply animating the outer and inner containers separately doesn't maintain
 * the inverse relationship throughout the transition.
 *
 * To address this, we use the Web Animation API to pre-compute a series of keyframes (roughly one per frame).
 * For each keyframe, we calculate the inverse scaling for the child container, ensuring that both the outer
 * and inner elements remain in sync throughout the animation.
 */
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

    // Decide the direction of animation
    const startTranslateX = isCollapsed ? 0 : translateX;
    const endTranslateX = isCollapsed ? translateX : 0;
    const startTranslateY = isCollapsed ? 0 : translateY;
    const endTranslateY = isCollapsed ? translateY : 0;
    const startScaleX = isCollapsed ? 1 : scaleX;
    const endScaleX = isCollapsed ? scaleX : 1;
    const startScaleY = isCollapsed ? 1 : scaleY;
    const endScaleY = isCollapsed ? scaleY : 1;

    const containerAnimation = containerEl.animate(
      Array.from({ length: 36 }, (_, i) => {
        const progress = i / (36 - 1);
        const currentTranslateX =
          startTranslateX + (endTranslateX - startTranslateX) * progress;
        const currentTranslateY =
          startTranslateY + (endTranslateY - startTranslateY) * progress;
        const currentScaleX =
          startScaleX + (endScaleX - startScaleX) * progress;
        const currentScaleY =
          startScaleY + (endScaleY - startScaleY) * progress;
        return {
          transform: `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0px) scale(${currentScaleX}, ${currentScaleY})`,
        };
      }),
      animationOptions
    );
    const innerAnimation = innerEl.animate(
      Array.from({ length: 36 }, (_, i) => {
        const progress = i / (36 - 1);
        const currentScaleX =
          startScaleX + (endScaleX - startScaleX) * progress;
        const currentScaleY =
          startScaleY + (endScaleY - startScaleY) * progress;
        return {
          transform: `scale(${1 / currentScaleX}, ${1 / currentScaleY})`,
        };
      }),
      animationOptions
    );
    return () => {
      containerAnimation.cancel();
      innerAnimation.cancel();
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
    transformOrigin: "top left",
    willChange: "transform",
  },
  inline: {
    display: "inline-block",
  },
});
