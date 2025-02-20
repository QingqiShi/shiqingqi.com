"use client";

import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";

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

    const keyFramesCount = 30;
    const containerAnimation = containerEl.animate(
      Array.from({ length: keyFramesCount }, (_, i) => {
        const progress = i / (keyFramesCount - 1);
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
          opacity: isCollapsed
            ? progress > 0.7
              ? 1 - (progress - 0.7) / 0.3
              : 1
            : progress >= 0.3
              ? 1
              : progress / 0.3,
        };
      }),
      animationOptions
    );
    const innerAnimation = innerEl.animate(
      Array.from({ length: keyFramesCount }, (_, i) => {
        const progress = i / (keyFramesCount - 1);
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
      css={[
        styles.container,
        inline && styles.inline,
        isCollapsed && styles.hidden,
      ]}
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
  hidden: {
    pointerEvents: "none",
    opacity: 0,
  },
});
