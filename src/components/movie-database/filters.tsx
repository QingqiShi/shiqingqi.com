import { Funnel } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { controlSize, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { fetchMovieGenres } from "@/utils/tmdb-api";
import { MenuButton } from "../shared/menu-button";
import { FiltersContainer } from "./filters-container";
import translations from "./filters.translations.json";
import { GenreFilter } from "./genre-filter";
import { SortFilter } from "./sort-filter";

interface FiltersProps {
  locale: SupportedLocale;
}

export async function Filters({ locale }: FiltersProps) {
  const { t } = getTranslations(translations, locale);

  const { genres } = await fetchMovieGenres({ language: locale });

  return (
    <FiltersContainer
      desktopChildren={
        <>
          <MenuButton
            menuContent={
              <div css={styles.desktopMenuContent}>
                <GenreFilter allGenres={genres} />
              </div>
            }
            buttonProps={{
              icon: <Funnel weight="bold" role="presentation" />,
              type: "button",
            }}
            position="topLeft"
          >
            {t("mainTitle")}
          </MenuButton>
          <SortFilter hideLabel />
        </>
      }
      mobileChildren={
        <MenuButton
          menuContent={
            <div css={styles.mobileMenuContent}>
              <SortFilter />
              <GenreFilter allGenres={genres} />
            </div>
          }
          buttonProps={{
            icon: (
              <span css={styles.mobileIcon}>
                <Funnel weight="bold" role="presentation" />
              </span>
            ),
            type: "button",
            isActive: true,
          }}
          position="topRight"
        >
          {t("mainTitle")}
        </MenuButton>
      }
    />
  );
}

const styles = stylex.create({
  desktopMenuContent: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
    padding: space._2,
    maxHeight: `calc(100dvh - 5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },

  mobileIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileMenuContent: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
    padding: space._2,
    width: `calc(100dvw - (${space._3} * 2))`,
    maxHeight: `calc(100dvh - 5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },
});
