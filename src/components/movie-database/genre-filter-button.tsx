"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
import { MenuButton } from "../shared/menu-button";
import { GenreFilter } from "./genre-filter";

export function GenreFilterButton() {
  const { genres } = useMediaFilters();

  return (
    <MenuButton
      menuContent={
        <div css={[flex.wrap, styles.desktopMenuContent]}>
          <GenreFilter hideTitle />
        </div>
      }
      buttonProps={{
        icon: <FunnelIcon weight="bold" role="presentation" />,
        type: "button",
        isActive: genres.size > 0,
      }}
      position="topLeft"
      popupRole="group"
    >
      {t({ en: "Genre", zh: "类型" })}
      {genres.size ? ` (${genres.size})` : null}
    </MenuButton>
  );
}

const styles = stylex.create({
  desktopMenuContent: {
    gap: space._4,
    padding: controlSize._3,
    maxHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },
});
