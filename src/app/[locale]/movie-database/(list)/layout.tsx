import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { DotGridBackground } from "#src/components/ai-chat/dot-grid-background.tsx";
import { FiltersSkeleton } from "#src/components/movie-database/filters-skeleton.tsx";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { HeroSection } from "#src/components/movie-database/hero-section.tsx";
import { HeroVisibilityProvider } from "#src/components/movie-database/hero-visibility-provider.tsx";
import { RetryableErrorBoundary } from "#src/components/shared/retryable-error-boundary.tsx";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { t } from "#src/i18n.ts";
import { ratio } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

const SKELETON_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  key: `skeleton-${String(i)}`,
  delay: i * 100,
}));

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
    <RetryableErrorBoundary
      message={t({
        en: "Something went wrong loading the movies.",
        zh: "加载电影时出错了。",
      })}
    >
      <DotGridBackground />
      <HeroVisibilityProvider>
        <main>
          <HeroSection />
          <Suspense
            fallback={
              <>
                <FiltersSkeleton locale={validatedLocale} />
                <Grid>
                  {SKELETON_ITEMS.map((item) => (
                    <Skeleton
                      key={item.key}
                      css={styles.skeleton}
                      delay={item.delay}
                    />
                  ))}
                </Grid>
              </>
            }
          >
            {children}
          </Suspense>
        </main>
      </HeroVisibilityProvider>
    </RetryableErrorBoundary>
  );
}

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
