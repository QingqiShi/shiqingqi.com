import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import HomeLayout from "#src/app/[locale]/(home)/layout.tsx";
import { FiltersSkeleton } from "#src/components/movie-database/filters-skeleton.tsx";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { t } from "#src/i18n.ts";
import { controlSize, ratio, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  return (
    <ErrorBoundary
      fallback={
        <HomeLayout params={params}>
          {t({
            en: "Sorry, couldn't afford to buy all the movies.",
            zh: "对不起，买不起所有的电影。",
          })}
        </HomeLayout>
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
