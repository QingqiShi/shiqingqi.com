import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import HomeLayout from "@/app/[locale]/(home)/layout";
import { FiltersSkeleton } from "@/components/movie-database/filters-skeleton";
import filtersTranslations from "@/components/movie-database/filters.translations.json";
import { Grid } from "@/components/movie-database/grid";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import cardTranslations from "@/components/shared/card.translations.json";
import { Skeleton } from "@/components/shared/skeleton";
import { TranslationProvider } from "@/components/shared/translation-provider";
import { controlSize, ratio, space } from "@/tokens.stylex";
import type { LayoutProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "../translations.json";

export default async function Layout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const { t } = getTranslations(translations, locale);
  return (
    <TranslationProvider
      locale={locale}
      translations={{
        card: cardTranslations,
        posterImage: posterImageTranslations,
        filters: filtersTranslations,
      }}
    >
      <ErrorBoundary
        fallback={
          <HomeLayout params={params}>😢 {t("errorMessage")}</HomeLayout>
        }
      >
        <main css={styles.container}>
          <Suspense
            fallback={
              <>
                <FiltersSkeleton />
                <Grid>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} css={styles.skeleton} delay={i * 100} />
                  ))}
                </Grid>
              </>
            }
          >
            {children}
          </Suspense>
        </main>
      </ErrorBoundary>
    </TranslationProvider>
  );
}

const styles = stylex.create({
  container: {
    paddingTop: {
      default: `calc(${controlSize._9} + ${space._3})`,
    },
  },
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
