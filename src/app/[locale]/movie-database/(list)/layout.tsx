import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import HomeLayout from "#src/app/[locale]/(home)/layout.tsx";
import { FiltersSkeleton } from "#src/components/movie-database/filters-skeleton.tsx";
import filtersTranslations from "#src/components/movie-database/filters.translations.json";
import { Grid } from "#src/components/movie-database/grid.tsx";
import mediaTypeToggleTranslations from "#src/components/movie-database/media-type-toggle.translations.json";
import posterImageTranslations from "#src/components/movie-database/poster-image.translations.json";
import movieDatabaseTranslations from "#src/components/movie-database/translations.json";
import cardTranslations from "#src/components/shared/card.translations.json";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { TranslationProvider } from "#src/components/shared/translation-provider.tsx";
import { controlSize, ratio, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import translations from "../translations.json";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  const { t } = getTranslations(translations, validatedLocale);
  return (
    <TranslationProvider
      locale={validatedLocale}
      translations={{
        card: cardTranslations,
        posterImage: posterImageTranslations,
        filters: filtersTranslations,
        mediaTypeToggle: mediaTypeToggleTranslations,
        movieDatabase: movieDatabaseTranslations,
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
                <FiltersSkeleton locale={validatedLocale} />
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
