import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { breakpoints } from "@/breakpoints";
import { Footer } from "@/components/home/footer";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import { BASE_URL } from "@/constants";
import { space } from "@/tokens.stylex";
import { getTranslations } from "@/utils/get-translations";
import { fetchTvShowDetails } from "@/utils/tmdb-api";
import translations from "./translations.json";
import type { LayoutProps, PageProps } from "./types";

export async function generateMetadata({ params }: PageProps) {
  const { locale, id } = await params;
  const tvShowDetails = await fetchTvShowDetails(id, { language: locale });
  const { t } = getTranslations(translations, locale);
  return {
    title:
      tvShowDetails.name ?? tvShowDetails.original_name ?? t("titleFallback"),
    description: tvShowDetails.tagline,
    alternates: {
      canonical: new URL(`/movie-database/tv/${id}`, BASE_URL).toString(),
      languages: {
        en: new URL(`/movie-database/tv/${id}`, BASE_URL).toString(),
        zh: new URL(`/zh/movie-database/tv/${id}`, BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { locale } = await params;
  return (
    <TranslationProvider
      locale={locale}
      translations={{
        card: cardTranslations,
        posterImage: posterImageTranslations,
      }}
    >
      <main>{children}</main>
      <div css={styles.container}>
        <div css={styles.wrapperInner}>
          <Footer locale={locale} />
        </div>
      </div>
    </TranslationProvider>
  );
}

const styles = stylex.create({
  container: {
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  wrapperInner: {
    paddingInline: space._3,
  },
});
