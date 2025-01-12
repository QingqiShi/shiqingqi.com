import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import HomeLayout from "@/app/[locale]/(home)/layout";
import { Grid } from "@/components/movie-database/grid";
import { Providers } from "@/components/shared/providers";
import { Skeleton } from "@/components/shared/skeleton";
import { BASE_URL } from "@/constants";
import { ratio } from "@/tokens.stylex";
import type { LayoutProps, PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: new URL("/movie-database", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database", BASE_URL).toString(),
        zh: new URL("/zh/movie-database", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const { t } = getTranslations(translations, locale);
  return (
    <Providers>
      <ErrorBoundary
        fallback={
          <HomeLayout params={params}>😢 {t("errorMessage")}</HomeLayout>
        }
      >
        <Suspense
          fallback={
            <Grid>
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} css={styles.skeleton} delay={i * 100} />
              ))}
            </Grid>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </Providers>
  );
}

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
