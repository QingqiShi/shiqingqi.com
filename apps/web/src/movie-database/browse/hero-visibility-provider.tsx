"use client";

import { bind, type Binding } from "@tuja/ui/motion/bind";
import {
  createMotionValue,
  type MotionValue,
} from "@tuja/ui/motion/create-motion-value";
import { mix, unit } from "@tuja/ui/motion/mix";
import { playLayout, type Rect } from "@tuja/ui/motion/play-layout";
import { px } from "@tuja/ui/motion/px";
import { springOf, springRoles } from "@tuja/ui/motion/spring-roles";
import { useMotionEngine } from "@tuja/ui/motion/use-motion-engine";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  DATA_HERO_COLLAPSED_BUTTON,
  DATA_HERO_REFINE_BUTTON,
  HeroVisibilityContext,
} from "./hero-visibility-context";
import { useIsElementVisible } from "./use-is-element-visible";

const MORPH_SPRING = springOf(springRoles.flight);
/** The share of the morph over which the outgoing form fades and blurs out. */
const HAND_OFF = 0.3;
const BLUR_PX = 3;
const handOff = (t: number) => unit(t / HAND_OFF);
const unblur = (t: number) => unit((t - HAND_OFF) / (1 - HAND_OFF));

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

/** `rect` in the coordinates of the document, so a scroll does not move it. */
function inDocument(rect: DOMRect): Rect {
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

interface Morph {
  readonly progress: MotionValue;
  readonly heroIsIncoming: boolean;
  readonly bindings: readonly Binding[];
}

/**
 * Plays `morph` to `target`: 1 shows the incoming form, 0 turns back to the
 * outgoing one. A toggle during the morph turns it from where it is.
 */
function playMorph(morph: Morph, target: number) {
  void morph.progress.to(target).finished.then((isDone) => {
    if (!isDone) return;
    for (const binding of morph.bindings) binding.unbind();
  });
}

export function HeroVisibilityProvider({ children }: { children: ReactNode }) {
  const heroElementRef = useRef<HTMLDivElement | null>(null);
  const { isVisible: isHeroInputVisible, setRef: heroSlotRef } =
    useIsElementVisible();
  const heroInputRef = (el: HTMLDivElement | null) => {
    heroElementRef.current = el;
  };
  const engine = useMotionEngine();
  const isFirstRenderRef = useRef(true);
  const morphRef = useRef<Morph | null>(null);
  const refinePrevRectRef = useRef<Rect | null>(null);

  useLayoutEffect(() => {
    const refineFound = findVisibleElement(`[${DATA_HERO_REFINE_BUTTON}]`);
    if (refineFound) {
      const prev = refinePrevRectRef.current;
      refinePrevRectRef.current = engine.measure(() =>
        inDocument(refineFound.el.getBoundingClientRect()),
      );
      if (prev && !isFirstRenderRef.current) {
        // The refine button can be another element than the one before, so
        // the move starts from the box on record whatever element it is.
        playLayout(
          engine,
          { origin: document.documentElement, rectOf: () => prev },
          [refineFound.el],
          { spring: MORPH_SPRING },
        );
      }
    } else {
      refinePrevRectRef.current = null;
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const hero = heroElementRef.current;
    if (!hero) return;
    const collapsed = findVisibleElement(`[${DATA_HERO_COLLAPSED_BUTTON}]`);
    if (!collapsed) return;

    const previous = morphRef.current;
    if (previous?.progress.isMoving === true) {
      playMorph(
        previous,
        previous.heroIsIncoming === isHeroInputVisible ? 1 : 0,
      );
      return;
    }
    if (previous) for (const binding of previous.bindings) binding.unbind();
    morphRef.current = null;

    const [heroRect, collapsedRect] = engine.measure(() => [
      hero.getBoundingClientRect(),
      collapsed.el.getBoundingClientRect(),
    ]);
    if (!hasLayout(heroRect) || !hasLayout(collapsedRect)) return;

    const incoming = isHeroInputVisible ? hero : collapsed.el;
    const outgoing = isHeroInputVisible ? collapsed.el : hero;
    const fromRect = isHeroInputVisible ? collapsedRect : heroRect;
    const toRect = isHeroInputVisible ? heroRect : collapsedRect;
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;
    const sx = fromRect.width / toRect.width;
    const sy = fromRect.height / toRect.height;

    const progress = createMotionValue(engine, 0, { spring: MORPH_SPRING });
    const morph = {
      progress,
      heroIsIncoming: isHeroInputVisible,
      bindings: [
        bind(incoming, progress, {
          pose: (t) => ({
            transform: `translate(${px(dx * (1 - t))}, ${px(dy * (1 - t))}) scale(${mix(sx, 1, t).toFixed(4)}, ${mix(sy, 1, t).toFixed(4)})`,
            opacity: unit(t).toFixed(3),
            filter: `blur(${px(BLUR_PX * (1 - unblur(t)))})`,
          }),
          hold: { "transform-origin": "top left" },
          rest: "clear",
        }),
        bind(outgoing, progress, {
          pose: (t) => ({
            opacity: (1 - handOff(t)).toFixed(3),
            filter: `blur(${px(BLUR_PX * handOff(t))})`,
          }),
          rest: "clear",
        }),
      ],
    };
    morphRef.current = morph;
    playMorph(morph, 1);
  }, [engine, isHeroInputVisible]);

  return (
    <HeroVisibilityContext
      value={{ isHeroInputVisible, heroInputRef, heroSlotRef }}
    >
      {children}
    </HeroVisibilityContext>
  );
}
