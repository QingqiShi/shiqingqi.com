"use client";

import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { useIsElementVisible } from "#src/hooks/use-is-element-visible.ts";
import { easing } from "#src/primitives/motion.stylex.ts";
import {
  DATA_HERO_COLLAPSED_BUTTON,
  DATA_HERO_REFINE_BUTTON,
  HeroVisibilityContext,
} from "./hero-visibility-context";

const MORPH_DURATION = 400;

function hasLayout(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0;
}

function findVisibleElement(selector: string) {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = el.getBoundingClientRect();
    if (hasLayout(rect)) return { el, rect };
  }
  return null;
}

export function HeroVisibilityProvider({ children }: { children: ReactNode }) {
  const heroElementRef = useRef<HTMLDivElement | null>(null);
  const { isVisible: isHeroInputVisible, setRef: setVisibilityRef } =
    useIsElementVisible();
  const heroInputRef = useCallback(
    (el: HTMLDivElement | null) => {
      heroElementRef.current = el;
      setVisibilityRef(el);
    },
    [setVisibilityRef],
  );
  const isFirstRenderRef = useRef(true);
  const morphAnimationsRef = useRef<Animation[]>([]);
  const refineAnimationRef = useRef<Animation | null>(null);
  const refinePrevRectRef = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const refineFound = findVisibleElement(`[${DATA_HERO_REFINE_BUTTON}]`);
    if (refineFound) {
      const { el: refine, rect } = refineFound;
      const prev = refinePrevRectRef.current;
      if (
        prev &&
        !isFirstRenderRef.current &&
        !prefersReducedMotion &&
        (Math.abs(prev.left - rect.left) > 0.5 ||
          Math.abs(prev.top - rect.top) > 0.5)
      ) {
        refineAnimationRef.current?.cancel();
        refineAnimationRef.current = refine.animate(
          [
            {
              transform: `translate(${String(prev.left - rect.left)}px, ${String(prev.top - rect.top)}px)`,
            },
            { transform: "translate(0, 0)" },
          ],
          { duration: MORPH_DURATION, easing: easing.entrance },
        );
      }
      refinePrevRectRef.current = rect;
    } else {
      refinePrevRectRef.current = null;
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const hero = heroElementRef.current;
    if (!hero) return;

    const collapsedFound = findVisibleElement(
      `[${DATA_HERO_COLLAPSED_BUTTON}]`,
    );
    if (!collapsedFound) return;

    for (const animation of morphAnimationsRef.current) {
      animation.cancel();
    }
    morphAnimationsRef.current = [];

    if (prefersReducedMotion) return;

    const heroRect = hero.getBoundingClientRect();
    if (!hasLayout(heroRect)) return;

    const incoming = isHeroInputVisible ? hero : collapsedFound.el;
    const outgoing = isHeroInputVisible ? collapsedFound.el : hero;
    const fromRect = isHeroInputVisible ? collapsedFound.rect : heroRect;
    const toRect = isHeroInputVisible ? heroRect : collapsedFound.rect;

    const deltaX = fromRect.left - toRect.left;
    const deltaY = fromRect.top - toRect.top;
    const scaleX = fromRect.width / toRect.width;
    const scaleY = fromRect.height / toRect.height;

    const incomingAnimation = incoming.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${String(deltaX)}px, ${String(deltaY)}px) scale(${String(scaleX)}, ${String(scaleY)})`,
          opacity: 0,
          filter: "blur(3px)",
        },
        {
          offset: 0.3,
          filter: "blur(3px)",
        },
        {
          transformOrigin: "top left",
          transform: "translate(0, 0) scale(1, 1)",
          opacity: 1,
          filter: "blur(0)",
        },
      ],
      { duration: MORPH_DURATION, easing: easing.entrance },
    );

    const outgoingAnimation = outgoing.animate(
      [
        { opacity: 1, filter: "blur(0)" },
        { offset: 0.3, opacity: 0, filter: "blur(3px)" },
        { opacity: 0, filter: "blur(3px)" },
      ],
      { duration: MORPH_DURATION, easing: easing.entrance },
    );

    morphAnimationsRef.current = [incomingAnimation, outgoingAnimation];
  }, [isHeroInputVisible]);

  useLayoutEffect(() => {
    return () => {
      for (const animation of morphAnimationsRef.current) {
        animation.cancel();
      }
      refineAnimationRef.current?.cancel();
    };
  }, []);

  return (
    <HeroVisibilityContext value={{ isHeroInputVisible, heroInputRef }}>
      {children}
    </HeroVisibilityContext>
  );
}
