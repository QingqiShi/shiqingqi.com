"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import type { PropsWithChildren, ReactNode } from "react";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import {
  DATA_HERO_REFINE_BUTTON,
  useHeroVisibility,
} from "./hero-visibility-context";

interface MobileFiltersButtonProps {
  menuContent?: ReactNode;
}

export function MobileFiltersButton({
  menuContent,
  children,
}: PropsWithChildren<MobileFiltersButtonProps>) {
  const { canReset, genres } = useMediaFilters();
  const { isHeroInputVisible } = useHeroVisibility();

  return (
    <div
      css={[styles.wrapper, isHeroInputVisible && styles.pushedRight]}
      {...{ [DATA_HERO_REFINE_BUTTON]: "" }}
    >
      <MenuButton
        menuContent={menuContent}
        buttonProps={{
          icon: (
            <span css={flex.center}>
              <FunnelIcon weight="bold" role="presentation" />
            </span>
          ),
          type: "button",
          isActive: canReset,
        }}
        // The panel is nearly bar-wide and this trigger sits mid-row (the chat
        // input and AI button follow it), so anchoring the panel to the
        // trigger's corner would hang most of it off the inline-start edge.
        position="sheet"
        popupRole="group"
      >
        {children}
        {genres.size ? ` (${String(genres.size)})` : null}
      </MenuButton>
    </div>
  );
}

const styles = stylex.create({
  wrapper: {
    display: "flex",
    // Deliberately no `will-change: transform` here, even though
    // `HeroVisibilityProvider` morphs this element: it would make the wrapper a
    // containing block for positioned descendants, which both shrinks
    // MenuButton's viewport-filling backdrop to the button's own box — leaving
    // the open panel undismissable — and collapses the sheet onto the button
    // instead of the filters bar. The trigger still gets its own compositing
    // layer from MenuButton's internal `FixedContainerContent`, and the browser
    // promotes this element for the duration of the morph animation anyway.
  },
  pushedRight: {
    marginInlineStart: { default: "auto", [breakpoints.md]: "unset" },
  },
});
