type SearchParamValue = string | number | boolean | undefined | null;

interface BuildTmdbUrlOptions {
  baseUrl: string;
  defaultParams?: Record<string, SearchParamValue>;
  params?: Record<string, SearchParamValue>;
}

export function buildTmdbUrl({
  baseUrl,
  defaultParams = {},
  params = {},
}: BuildTmdbUrlOptions): string {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== undefined) {
      // Only add param if it differs from the default value
      if (defaultParams[key] === undefined || value !== defaultParams[key]) {
        url.searchParams.set(key, value.toString());
      }
    }
  });

  return url.toString();
}
