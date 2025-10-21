import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import HomeLayout from "@/app/[locale]/(home)/layout";
import { FiltersSkeleton } from "@/components/movie-database/filters-skeleton";
import filtersTranslations from "@/components/movie-database/filters.translations.json";
import { Grid } from "@/components/movie-database/grid";
import mediaTypeToggleTranslations from "@/components/movie-database/media-type-toggle.translations.json";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import movieDatabaseTranslations from "@/components/movie-database/translations.json";
import cardTranslations from "@/components/shared/card.translations.json";
import { Skeleton } from "@/components/shared/skeleton";
import { TranslationProvider } from "@/components/shared/translation-provider";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { validateLocale } from "@/utils/validate-locale";
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
        <main className="pt-[calc(3rem+0.75rem)]">
          <Suspense
            fallback={
              <>
                <FiltersSkeleton locale={validatedLocale} />
                <Grid>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="aspect-poster w-full"
                      delay={i * 100}
                    />
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
