"use client";

import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";

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
 * Uses the FLIP technique to run animations from natural state to a target - which essentially measures the bounding rect
 * of the natural state and the target state, then runs the animation between them.
 * During the animation, the inner content is applied the inverse scaling to create a clipping effect, this adds additional
 * complexity because you animating the outer and inner containers separately does not result in the inverse relationship
 * throughout the duration of the animation. To do this, we could either
 * - Use the Animation API to animate CSS variables - this works fine in Chrome but animating CSS variables has terrible
 * performance in iOS Safari.
 * - Animate every frame using `requestAnimationFrame` - this is the approach chosen.
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

    // For typescript
    const containerElNotNull = containerEl;
    const innerElNotNull = innerEl;

    // Decide the direction of animation
    const startTranslateX = isCollapsed ? 0 : translateX;
    const endTranslateX = isCollapsed ? translateX : 0;
    const startTranslateY = isCollapsed ? 0 : translateY;
    const endTranslateY = isCollapsed ? translateY : 0;
    const startScaleX = isCollapsed ? 1 : scaleX;
    const endScaleX = isCollapsed ? scaleX : 1;
    const startScaleY = isCollapsed ? 1 : scaleY;
    const endScaleY = isCollapsed ? scaleY : 1;

    // Runs on every animation frame
    const duration = 300;
    const startTime = performance.now();
    let animationId: ReturnType<typeof requestAnimationFrame> | null = null;
    function animate() {
      const elapsed = performance.now() - startTime;
      // Calculate linear progress between 0 and 1
      const progress = Math.min(elapsed / duration, 1);

      // Apply easing to the progress value
      const easedProgress = easeOutCubic(progress);

      // Compute translation and scale values for the current animation frame
      const currentTranslateX =
        startTranslateX + (endTranslateX - startTranslateX) * easedProgress;
      const currentTranslateY =
        startTranslateY + (endTranslateY - startTranslateY) * easedProgress;
      const currentScaleX =
        startScaleX + (endScaleX - startScaleX) * easedProgress;
      const currentScaleY =
        startScaleY + (endScaleY - startScaleY) * easedProgress;

      // Update the transforms
      containerElNotNull.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(${currentScaleX}, ${currentScaleY})`;
      innerElNotNull.style.transform = `scale(${1 / currentScaleX}, ${1 / currentScaleY})`;

      // Animate next frame, or terminate and reset
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        containerElNotNull.style.transform = "";
        innerElNotNull.style.transform = "";
      }
    }
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
