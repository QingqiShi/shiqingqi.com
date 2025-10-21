import { Suspense } from "react";
import { Grid } from "@/components/movie-database/grid";
import { SearchContent } from "@/components/movie-database/search-content";
import { Skeleton } from "@/components/shared/skeleton";
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
    <div className="p-3 max-w-[1200px] mx-auto">
      <AISearchHeader title={t("aiSearchResults")} query={query} />

      {!query ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
          <p className="text-lg text-gray-11 dark:text-grayDark-11 m-0">
            {t("noQuery")}
          </p>
        </div>
      ) : (
        <Suspense
          fallback={
            <Grid>
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-poster w-full"
                  delay={i * 100}
                />
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
    <div className="flex items-start gap-4 mb-6 flex-wrap">
      <div className="flex-grow min-w-0">
        <h1 className="text-2xl font-bold text-gray-12 dark:text-grayDark-12 m-0 mb-1">
          {title}
        </h1>
        {query && (
          <p className="text-base text-control-active font-semibold m-0">
            "{query}"
          </p>
        )}
      </div>
    </div>
  );
}
