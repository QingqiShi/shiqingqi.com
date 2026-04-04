import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import HomeLayout from "#src/app/[locale]/(home)/layout.tsx";
import { FiltersSkeleton } from "#src/components/movie-database/filters-skeleton.tsx";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { t } from "#src/i18n.ts";
import { color, controlSize, font, ratio, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

const SKELETON_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  key: `skeleton-${i}`,
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
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <HomeLayout params={params}>
          <ErrorFallback onRetry={resetErrorBoundary} />
        </HomeLayout>
      )}
    >
      <main css={styles.container}>
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
    </ErrorBoundary>
  );
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div css={styles.errorContainer} role="alert">
      <p css={styles.errorText}>
        {t({
          en: "Something went wrong loading the movies.",
          zh: "加载电影时出错了。",
        })}
      </p>
      <button type="button" css={styles.retryButton} onClick={onRetry}>
        {t({ en: "Try again", zh: "重试" })}
      </button>
    </div>
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
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space._4,
    minHeight: "60vh",
    padding: space._6,
    textAlign: "center",
  },
  errorText: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: 0,
  },
  retryButton: {
    paddingBlock: space._2,
    paddingInline: space._5,
    fontSize: font.uiBody,
    fontWeight: font.weight_5,
    fontFamily: font.family,
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: "9999px",
    backgroundColor: color.controlActive,
    color: color.textOnActive,
    cursor: "pointer",
  },
});
