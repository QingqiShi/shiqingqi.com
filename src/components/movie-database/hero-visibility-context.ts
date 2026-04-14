import { createContext, use, type RefObject } from "react";

interface HeroVisibilityState {
  isHeroInputVisible: boolean;
  heroInputRef: RefObject<HTMLDivElement | null>;
}

export const HeroVisibilityContext = createContext<HeroVisibilityState>({
  isHeroInputVisible: true,
  heroInputRef: { current: null },
});

export function useHeroVisibility() {
  return use(HeroVisibilityContext);
}

export const DATA_HERO_COLLAPSED_BUTTON = "data-hero-collapsed-button";
export const DATA_HERO_REFINE_BUTTON = "data-hero-refine-button";
