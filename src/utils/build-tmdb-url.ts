type SearchParamValue = string | number | boolean | undefined | null;

interface BuildTmdbUrlOptions {
  baseUrl: string;
  defaultParams?: Record<string, SearchParamValue>;
  params?: Record<string, SearchParamValue>;
}

export function buildTmdbUrl({ baseUrl, defaultParams = {}, params = {} }: BuildTmdbUrlOptions): string {
  const url = new URL(baseUrl);
  
  const allParams = { ...defaultParams, ...params };
  
  Object.entries(allParams).forEach(([key, value]) => {
    if (value != null && value !== undefined) {
      if (key === "language" && value === "en") {
        return;
      }
      
      url.searchParams.set(key, value.toString());
    }
  });
  
  return url.toString();
}