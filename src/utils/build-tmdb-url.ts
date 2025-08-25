type SearchParamValue = string | number | boolean | undefined | null;

interface BuildTmdbUrlOptions {
  baseUrl: string;
  params?: Record<string, SearchParamValue>;
}

export function buildTmdbUrl({
  baseUrl,
  params = {},
}: BuildTmdbUrlOptions): string {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== undefined) {
      // Omit TMDB API defaults
      if (key === "language" && value === "en") {
        return;
      }

      url.searchParams.set(key, value.toString());
    }
  });

  return url.toString();
}
