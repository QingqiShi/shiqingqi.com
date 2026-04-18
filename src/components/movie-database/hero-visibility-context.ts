import { createContext, use, type RefCallback } from "react";

interface HeroVisibilityState {
  isHeroInputVisible: boolean;
  heroInputRef: RefCallback<HTMLDivElement>;
}

export const HeroVisibilityContext = createContext<HeroVisibilityState>({
  isHeroInputVisible: true,
  heroInputRef: () => {},
});

export function useHeroVisibility() {
  return use(HeroVisibilityContext);
}

export const DATA_HERO_COLLAPSED_BUTTON = "data-hero-collapsed-button";
export const DATA_HERO_REFINE_BUTTON = "data-hero-refine-button";
