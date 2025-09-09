import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { Grid } from "@/components/movie-database/grid";
import { SearchContent } from "@/components/movie-database/search-content";
import { Skeleton } from "@/components/shared/skeleton";
import { color, ratio, space } from "@/tokens.stylex";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "../translations.json";

interface AISearchPageProps extends PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AISearchPage(props: AISearchPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { t } = getTranslations(translations, params.locale);

  const query = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q;

  return (
    <div css={styles.container}>
      <AISearchHeader title={t("aiSearchResults")} query={query} />

      {!query ? (
        <div css={styles.emptyState}>
          <p css={styles.emptyText}>{t("noQuery")}</p>
        </div>
      ) : (
        <Suspense
          fallback={
            <Grid>
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} css={styles.skeleton} delay={i * 100} />
              ))}
            </Grid>
          }
        >
          <SearchContent query={query} locale={params.locale} />
        </Suspense>
      )}
    </div>
  );
}

interface AISearchHeaderProps {
  title: string;
  query?: string;
}

function AISearchHeader({ title, query }: AISearchHeaderProps) {
  return (
    <div css={styles.header}>
      <div css={styles.headerContent}>
        <h1 css={styles.title}>{title}</h1>
        {query && <p css={styles.queryText}>"{query}"</p>}
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    padding: space._3,
    maxWidth: "1200px",
    marginInline: "auto",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: space._4,
    marginBottom: space._6,
    flexWrap: "wrap",
  },

  headerContent: {
    flexGrow: 1,
    minWidth: 0,
  },

  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: color.textMain,
    margin: 0,
    marginBottom: space._1,
  },

  queryText: {
    fontSize: "16px",
    color: color.controlActive,
    fontWeight: 600,
    margin: 0,
  },

  resultCount: {
    color: color.textMuted,
    fontWeight: 400,
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    textAlign: "center",
    padding: space._6,
  },

  emptyText: {
    fontSize: "18px",
    color: color.textMuted,
    margin: 0,
  },

  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
