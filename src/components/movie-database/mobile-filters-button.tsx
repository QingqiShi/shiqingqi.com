"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren, ReactNode } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { MenuButton } from "../shared/menu-button";
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
