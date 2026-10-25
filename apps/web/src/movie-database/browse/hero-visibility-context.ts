import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { createContext, use, type RefCallback } from "react";

interface HeroVisibilityState {
  isHeroInputVisible: boolean;
  heroInputRef: RefCallback<HTMLDivElement>;
  /**
   * A box around the hero input that the morph does not move. It tells if the
   * hero input is on the screen. If the observer looked at the hero input,
   * the morph would change what it sees, and each would start the other again.
   */
  heroSlotRef: RefCallback<HTMLDivElement>;
}

export const HeroVisibilityContext = createContext<HeroVisibilityState>({
  isHeroInputVisible: true,
  heroInputRef: () => {},
  heroSlotRef: () => {},
});

export function useHeroVisibility() {
  const state = use(HeroVisibilityContext);
  const isHydrated = useIsHydrated();
  // The provider sits in the shell, so it can see the hero leave the viewport
  // before a streamed boundary below it hydrates. The server rendered every
  // consumer with the hero visible, and React does not patch an attribute
  // that the hydration pass disagrees on.
  return isHydrated ? state : { ...state, isHeroInputVisible: true };
}

export const DATA_HERO_COLLAPSED_BUTTON = "data-hero-collapsed-button";
export const DATA_HERO_REFINE_BUTTON = "data-hero-refine-button";
