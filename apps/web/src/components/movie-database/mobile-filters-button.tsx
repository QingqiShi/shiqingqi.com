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
        position="topRight"
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
    willChange: "transform",
  },
  pushedRight: {
    marginInlineStart: { default: "auto", [breakpoints.md]: "unset" },
  },
});
