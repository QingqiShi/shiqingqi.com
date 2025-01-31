"use client";

import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "next/navigation";
import { breakpoints } from "@/breakpoints";
import { useTranslations } from "@/hooks/use-translations";
import { controlSize, space } from "@/tokens.stylex";
import type { Genre } from "@/utils/tmdb-api";
import { MenuButton } from "../shared/menu-button";
import { MenuItem } from "../shared/menu-item";
import type translations from "./filters.translations.json";

interface FiltersProps {
  genres?: Genre[];
}

export function Filters({ genres }: FiltersProps) {
  const searchParams = useSearchParams();
  const { t } = useTranslations<typeof translations>("filters");

  const currentGenre = searchParams.get("genre") ?? undefined;

  return (
    <div css={styles.container}>
      <MenuButton
        buttonProps={{
          type: "button",
          "aria-label": t("genre"),
        }}
        menuContent={
          <div css={styles.menu}>
            {genres?.map((genre) => (
              <MenuItem
                key={genre.id}
                href={`?genre=${genre.id}`}
                isActive={currentGenre === genre.id.toString()}
              >
                {genre.name}
              </MenuItem>
            ))}
          </div>
        }
        position="topLeft"
      >
        {t("genre")}
      </MenuButton>
    </div>
  );
}

const styles = stylex.create({
  container: {
    marginTop: "5rem",
    marginInline: "auto",
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    paddingBottom: space._2,
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: controlSize._1,
    overflow: "auto",
    padding: controlSize._1,
    maxHeight: space._14,
  },
});
