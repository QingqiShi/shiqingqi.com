"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren, ReactNode } from "react";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { MenuButton } from "../shared/menu-button";

interface MobileFiltersButtonProps {
  menuContent?: ReactNode;
}

export function MobileFiltersButton({
  menuContent,
  children,
}: PropsWithChildren<MobileFiltersButtonProps>) {
  const { canReset, genres } = useMediaFilters();

  return (
    <MenuButton
      menuContent={menuContent}
      buttonProps={{
        icon: (
          <span css={styles.mobileIcon}>
            <FunnelIcon weight="bold" role="presentation" />
          </span>
        ),
        type: "button",
        isActive: canReset,
      }}
      position="topRight"
    >
      {children}
      {genres.size ? ` (${genres.size})` : null}
    </MenuButton>
  );
}

const styles = stylex.create({
  mobileIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});
